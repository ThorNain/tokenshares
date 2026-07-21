/**
 * Pipeline de fulfillment d'une commande :
 *
 *   paiement confirmé (webhook signé)
 *     → couverture simulée (MockBrokerProvider)
 *       → émission du token ERC-1155 (idempotente, clé unique en base)
 *         → QR code + objet physique
 *           → expédition → livraison
 *
 * Toutes les étapes sont idempotentes et relançables individuellement par
 * l'administrateur. La confirmation de paiement n'est JAMAIS déclenchée par
 * un retour navigateur : uniquement par webhook vérifié (Stripe) ou par le
 * simulateur local (fournisseur mock).
 */
import "server-only";
import { prisma } from "@/lib/db";
import { audit, SYSTEM_ACTOR, type Actor } from "@/lib/audit";
import { logError, safeErrorMessage } from "@/lib/error-log";
import { env } from "@/lib/env";
import { generateOrderPublicId, generatePublicToken } from "@/lib/public-token";
import { getBrokerProvider } from "@/lib/providers/broker";
import { getBlockchainProvider } from "@/lib/providers/blockchain";
import { getShippingProvider } from "@/lib/providers/shipping/mock";
import { getSellableQuantity } from "@/lib/portfolio";

export class FulfillmentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "FulfillmentError";
  }
}

// ---------------------------------------------------------------------------
// Idempotence des événements webhook
// ---------------------------------------------------------------------------

/**
 * Enregistre un événement externe. Retourne false si l'événement a déjà été
 * traité (contrainte d'unicité en base = protection contre les doubles
 * émissions, section 6 du cahier des charges).
 */
async function claimWebhookEvent(params: {
  provider: string;
  externalId: string;
  type: string;
  orderId?: string;
}): Promise<boolean> {
  try {
    await prisma.webhookEvent.create({
      data: {
        provider: params.provider,
        externalId: params.externalId,
        type: params.type,
        orderId: params.orderId ?? null,
      },
    });
    return true;
  } catch {
    // Violation d'unicité → événement déjà traité.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Paiement
// ---------------------------------------------------------------------------

export async function markPaymentSucceeded(params: {
  orderId: string;
  provider: string;
  externalEventId: string;
  stripePaymentIntentId?: string | null;
  amountReceived?: number | null;
  method?: string | null;
  webhookVerified: boolean;
  actor?: Actor;
}): Promise<{ alreadyProcessed: boolean }> {
  const actor = params.actor ?? SYSTEM_ACTOR;

  const isNew = await claimWebhookEvent({
    provider: params.provider,
    externalId: params.externalEventId,
    type: "payment_succeeded",
    orderId: params.orderId,
  });
  if (!isNew) return { alreadyProcessed: true };

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true },
  });
  if (!order || !order.payment) {
    throw new FulfillmentError(`Commande ou paiement introuvable : ${params.orderId}`, 404);
  }
  if (order.payment.status === "succeeded") {
    return { alreadyProcessed: true };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId: order.id },
      data: {
        status: "succeeded",
        paidAt: now,
        amountReceived: params.amountReceived ?? order.payment!.amount,
        method: params.method ?? null,
        stripePaymentIntentId: params.stripePaymentIntentId ?? order.payment!.stripePaymentIntentId,
        webhookVerified: params.webhookVerified,
        failureMessage: null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "paid", paidAt: now },
    });
  });

  await audit({
    actor,
    action: "payment_confirmed",
    entityType: "Payment",
    entityId: order.payment.id,
    orderId: order.id,
    oldValue: order.payment.status,
    newValue: "succeeded",
  });

  // Poursuite automatique du pipeline (chaque étape gère ses propres erreurs).
  await advancePipeline(order.id, actor);
  return { alreadyProcessed: false };
}

export async function markPaymentFailed(params: {
  orderId: string;
  provider: string;
  externalEventId: string;
  reason: string;
  actor?: Actor;
}): Promise<{ alreadyProcessed: boolean }> {
  const isNew = await claimWebhookEvent({
    provider: params.provider,
    externalId: params.externalEventId,
    type: "payment_failed",
    orderId: params.orderId,
  });
  if (!isNew) return { alreadyProcessed: true };

  const payment = await prisma.payment.findUnique({ where: { orderId: params.orderId } });
  if (!payment || payment.status === "succeeded") return { alreadyProcessed: true };

  await prisma.payment.update({
    where: { orderId: params.orderId },
    data: { status: "failed", failureMessage: params.reason, webhookVerified: true },
  });

  await audit({
    actor: params.actor ?? SYSTEM_ACTOR,
    action: "payment_failed",
    entityType: "Payment",
    entityId: payment.id,
    orderId: params.orderId,
    newValue: params.reason,
  });

  await logError({
    service: params.provider === "stripe" ? "stripe" : "app",
    type: "payment_failed",
    severity: "warning",
    message: `Paiement échoué pour la commande ${params.orderId}.`,
    technicalMessage: params.reason,
    orderId: params.orderId,
  });

  return { alreadyProcessed: false };
}

/** Enchaîne couverture → mint → préparation d'expédition après un paiement. */
export async function advancePipeline(orderId: string, actor: Actor = SYSTEM_ACTOR): Promise<void> {
  const hedged = await runHedging(orderId, actor);
  // En courtier manuel, la couverture reste « en attente » jusqu'à ce que
  // l'opérateur saisisse le prix réel d'exécution : le pipeline s'arrête ici
  // et reprendra via confirmHedgePrice().
  if (!hedged.ok || hedged.pending) return;
  const minted = await runMint(orderId, actor);
  if (!minted.ok) return;
  await prepareShipping(orderId, actor);
}

// ---------------------------------------------------------------------------
// Couverture simulée (achat d'action chez le courtier fictif)
// ---------------------------------------------------------------------------

export async function runHedging(
  orderId: string,
  actor: Actor = SYSTEM_ACTOR,
): Promise<{ ok: boolean; alreadyDone?: boolean; pending?: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { asset: true } }, payment: true, hedgingOrder: true },
  });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);
  if (order.payment?.status !== "succeeded") {
    throw new FulfillmentError("Le paiement doit être confirmé avant la couverture.", 409);
  }
  if (order.hedgingOrder?.status === "simulated_filled") {
    return { ok: true, alreadyDone: true };
  }
  // Déjà en attente d'exécution manuelle : ne pas relancer d'ordre courtier.
  if (order.hedgingOrder?.status === "pending") {
    return { ok: true, pending: true };
  }
  const item = order.items[0];
  if (!item) throw new FulfillmentError("Commande vide.", 500);

  const broker = getBrokerProvider();
  const hedging = await prisma.hedgingOrder.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      assetId: item.assetId,
      ticker: item.asset.ticker,
      quantity: item.quantity,
      referencePrice: item.lockedMarketPrice,
      currency: item.currency,
      notionalAmount: item.lockedMarketPrice * item.quantity,
      status: "processing",
      provider: broker.name,
      attempts: 1,
    },
    update: { status: "processing", provider: broker.name, attempts: { increment: 1 }, lastError: null },
  });

  const result = await broker.buyAsset({
    orderId: order.id,
    ticker: item.asset.ticker,
    quantity: item.quantity,
    referencePrice: item.lockedMarketPrice,
    currency: item.currency,
  });

  if (!result.ok) {
    await prisma.hedgingOrder.update({
      where: { id: hedging.id },
      data: { status: "failed", lastError: result.error ?? "Erreur courtier inconnue" },
    });
    await prisma.order.update({ where: { id: order.id }, data: { needsReview: true } });
    await logError({
      service: "broker",
      type: "hedging_failed",
      message: `Couverture échouée pour ${item.asset.ticker} (commande ${order.publicId}).`,
      technicalMessage: result.error,
      orderId: order.id,
      attempts: hedging.attempts,
    });
    return { ok: false, error: result.error };
  }

  // Courtier manuel : l'ordre attend l'exécution réelle par l'opérateur.
  if (result.pending) {
    await prisma.hedgingOrder.update({
      where: { id: hedging.id },
      data: { status: "pending", brokerRef: result.brokerRef ?? null },
    });
    await audit({
      actor,
      action: "hedging_pending_manual",
      entityType: "HedgingOrder",
      entityId: hedging.id,
      orderId: order.id,
      newValue: JSON.stringify({ brokerRef: result.brokerRef, quantity: item.quantity }),
    });
    return { ok: true, pending: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.hedgingOrder.update({
      where: { id: hedging.id },
      data: {
        status: "simulated_filled",
        brokerRef: result.brokerRef ?? null,
        executedPrice: result.executedPrice ?? item.lockedMarketPrice,
        executedAt: result.executedAt ?? new Date(),
      },
    });
    // La commande ne recule jamais dans le pipeline.
    if (order.status === "paid" || order.status === "failed") {
      await tx.order.update({ where: { id: order.id }, data: { status: "hedge_simulated" } });
    }
  });

  await audit({
    actor,
    action: "hedging_simulated_filled",
    entityType: "HedgingOrder",
    entityId: hedging.id,
    orderId: order.id,
    newValue: JSON.stringify({ brokerRef: result.brokerRef, quantity: item.quantity }),
  });

  return { ok: true };
}

/**
 * Confirme le prix réel d'exécution de la couverture (mode courtier manuel) :
 * l'opérateur a acheté l'action chez son courtier et saisit le prix obtenu.
 * La couverture passe « exécutée », puis le pipeline reprend (mint + expédition).
 */
export async function confirmHedgePrice(params: {
  orderId: string;
  executedPrice: number;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { hedgingOrder: true },
  });
  if (!order || !order.hedgingOrder) {
    throw new FulfillmentError("Couverture introuvable pour cette commande.", 404);
  }
  if (!["pending", "processing", "failed"].includes(order.hedgingOrder.status)) {
    throw new FulfillmentError(
      `La couverture n'est pas en attente d'exécution (statut « ${order.hedgingOrder.status} »).`,
      409,
    );
  }
  if (!Number.isFinite(params.executedPrice) || params.executedPrice <= 0) {
    throw new FulfillmentError("Prix d'exécution invalide.", 400);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.hedgingOrder.update({
      where: { id: order.hedgingOrder!.id },
      data: {
        status: "simulated_filled",
        executedPrice: params.executedPrice,
        notionalAmount: params.executedPrice * order.hedgingOrder!.quantity,
        executedAt: now,
        lastError: null,
      },
    });
    if (order.status === "paid" || order.status === "failed") {
      await tx.order.update({ where: { id: order.id }, data: { status: "hedge_simulated" } });
    }
  });

  await audit({
    actor: params.actor,
    action: "hedging_price_confirmed",
    entityType: "HedgingOrder",
    entityId: order.hedgingOrder.id,
    orderId: order.id,
    newValue: JSON.stringify({ executedPrice: params.executedPrice }),
  });

  // Reprise du pipeline : émission du token puis préparation d'expédition.
  const minted = await runMint(order.id, params.actor);
  if (!minted.ok) return { ok: false, error: minted.error };
  await prepareShipping(order.id, params.actor);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Émission du token (idempotente)
// ---------------------------------------------------------------------------

export async function runMint(
  orderId: string,
  actor: Actor = SYSTEM_ACTOR,
  options?: { simulateFailure?: boolean },
): Promise<{ ok: boolean; alreadyDone?: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { asset: true } },
      user: { include: { wallets: true } },
      hedgingOrder: true,
      tokenMint: true,
      payment: true,
    },
  });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);
  if (order.payment?.status !== "succeeded") {
    throw new FulfillmentError("Le paiement doit être confirmé avant l'émission.", 409);
  }
  if (order.hedgingOrder?.status !== "simulated_filled") {
    throw new FulfillmentError("La couverture doit être exécutée avant l'émission du token.", 409);
  }
  if (order.tokenMint?.status === "transfer_confirmed") {
    return { ok: true, alreadyDone: true };
  }
  if (order.tokenMint && ["minting", "mint_submitted"].includes(order.tokenMint.status)) {
    return { ok: false, error: "Une émission est déjà en cours pour cette commande." };
  }

  const item = order.items[0];
  if (!item) throw new FulfillmentError("Commande vide.", 500);
  const wallet = order.user.wallets[0];
  if (!wallet) {
    await logError({
      service: "mint",
      type: "missing_wallet",
      severity: "critical",
      message: `Aucun wallet enregistré pour l'utilisateur de la commande ${order.publicId}.`,
      orderId: order.id,
      userId: order.userId,
    });
    return { ok: false, error: "Aucun wallet de destination." };
  }

  const chain = getBlockchainProvider();
  // Clé d'idempotence dérivée de la commande : la contrainte UNIQUE en base
  // garantit qu'un même paiement ne peut jamais provoquer deux émissions.
  const idempotencyKey = `mint:${order.id}`;

  const mint = await prisma.tokenMint.upsert({
    where: { idempotencyKey },
    create: {
      orderId: order.id,
      assetId: item.assetId,
      tokenId: item.asset.tokenId,
      contractAddress: chain.contractAddress,
      network: chain.network,
      quantity: item.quantity,
      toAddress: wallet.address,
      status: "minting",
      attempts: 1,
      idempotencyKey,
    },
    update: { status: "minting", attempts: { increment: 1 }, lastError: null },
  });

  await prisma.order.update({ where: { id: order.id }, data: { status: "mint_pending" } });

  const simulateFailure =
    options?.simulateFailure === true || env.failMintTickers.includes(item.asset.ticker);

  const result = await chain.mintTo({
    idempotencyKey,
    tokenId: item.asset.tokenId,
    quantity: item.quantity,
    toAddress: wallet.address,
    simulateFailure,
  });

  if (!result.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.tokenMint.update({
        where: { id: mint.id },
        data: { status: "failed", lastError: result.error ?? "Erreur blockchain inconnue" },
      });
      await tx.blockchainTransaction.create({
        data: {
          orderId: order.id,
          tokenMintId: mint.id,
          type: "mint",
          network: chain.network,
          fromAddress: chain.minterAddress,
          toAddress: wallet.address,
          tokenId: item.asset.tokenId,
          quantity: item.quantity,
          txHash: result.txHash ?? null,
          status: "failed",
          error: result.error ?? null,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: "failed", needsReview: true },
      });
    });
    await logError({
      service: "blockchain",
      type: "mint_failed",
      severity: "critical",
      message: `Émission du token ${item.asset.ticker} échouée (commande ${order.publicId}).`,
      technicalMessage: result.error,
      orderId: order.id,
      attempts: mint.attempts,
    });
    return { ok: false, error: result.error };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.tokenMint.update({
      where: { id: mint.id },
      data: {
        // Le mint ERC-1155 crédite directement le wallet du client : la
        // création et le transfert sont confirmés par la même transaction.
        status: "transfer_confirmed",
        txHash: result.txHash ?? null,
        blockNumber: result.blockNumber ?? null,
        confirmations: result.confirmations ?? 1,
        feeWei: result.feeWei ?? null,
        submittedAt: now,
        confirmedAt: now,
      },
    });
    await tx.blockchainTransaction.create({
      data: {
        orderId: order.id,
        tokenMintId: mint.id,
        type: "mint",
        network: chain.network,
        fromAddress: chain.minterAddress,
        toAddress: wallet.address,
        tokenId: item.asset.tokenId,
        quantity: item.quantity,
        txHash: result.txHash ?? null,
        blockNumber: result.blockNumber ?? null,
        status: "confirmed",
        confirmations: result.confirmations ?? 1,
        feeWei: result.feeWei ?? null,
        confirmedAt: now,
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: "minted" } });
  });

  await audit({
    actor,
    action: "token_minted",
    entityType: "TokenMint",
    entityId: mint.id,
    orderId: order.id,
    newValue: JSON.stringify({
      tokenId: item.asset.tokenId,
      quantity: item.quantity,
      txHash: result.txHash,
      toAddress: wallet.address,
    }),
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// QR code + objet physique
// ---------------------------------------------------------------------------

export async function prepareShipping(orderId: string, actor: Actor = SYSTEM_ACTOR): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { qrCodes: { where: { active: true } }, physicalItem: true },
  });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);

  if (order.qrCodes.length === 0) {
    const qr = await prisma.qrCode.create({
      data: { orderId: order.id, publicToken: generatePublicToken(), active: true },
    });
    await audit({
      actor,
      action: "qr_generated",
      entityType: "QrCode",
      entityId: qr.id,
      orderId: order.id,
    });
  }

  if (!order.physicalItem) {
    await prisma.physicalItem.create({
      data: { orderId: order.id, kind: "miniature_car", status: "preparing" },
    });
  } else if (order.physicalItem.status === "not_started") {
    await prisma.physicalItem.update({
      where: { orderId: order.id },
      data: { status: "preparing" },
    });
  }

  if (order.status === "minted") {
    await prisma.order.update({ where: { id: order.id }, data: { status: "shipping_pending" } });
  }
}

/** Régénère le QR code (compromission) : révoque l'ancien lien, crée le nouveau. */
export async function regenerateQr(
  orderId: string,
  actor: Actor,
  justification?: string,
): Promise<{ publicToken: string }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);

  const newToken = generatePublicToken();
  await prisma.$transaction(async (tx) => {
    await tx.qrCode.updateMany({
      where: { orderId, active: true },
      data: { active: false, revokedAt: new Date() },
    });
    await tx.qrCode.create({
      data: { orderId, publicToken: newToken, active: true },
    });
  });

  await audit({
    actor,
    action: "qr_regenerated",
    entityType: "QrCode",
    entityId: orderId,
    orderId,
    justification: justification ?? null,
  });

  return { publicToken: newToken };
}

// ---------------------------------------------------------------------------
// Expédition / livraison
// ---------------------------------------------------------------------------

export async function markShipped(params: {
  orderId: string;
  actor: Actor;
  carrier?: string;
  trackingNumber?: string;
  justification?: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { physicalItem: true, shippingAddress: true },
  });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);
  if (!order.shippingAddress) {
    throw new FulfillmentError("Adresse de livraison manquante.", 409);
  }
  if (!["shipping_pending", "minted"].includes(order.status)) {
    throw new FulfillmentError(
      `Impossible d'expédier une commande au statut « ${order.status} ».`,
      409,
    );
  }

  let carrier = params.carrier;
  let trackingNumber = params.trackingNumber;
  let estimatedDeliveryAt: Date | undefined;
  if (!carrier || !trackingNumber) {
    const shipment = await getShippingProvider().createShipment(order.id);
    carrier = carrier ?? shipment.carrier;
    trackingNumber = trackingNumber ?? shipment.trackingNumber;
    estimatedDeliveryAt = shipment.estimatedDeliveryAt;
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.physicalItem.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        status: "shipped",
        carrier,
        trackingNumber,
        shippedAt: now,
        estimatedDeliveryAt: estimatedDeliveryAt ?? null,
      },
      update: {
        status: "shipped",
        carrier,
        trackingNumber,
        shippedAt: now,
        estimatedDeliveryAt: estimatedDeliveryAt ?? undefined,
      },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: "shipped" } });
  });

  await audit({
    actor: params.actor,
    action: "order_shipped",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    oldValue: order.status,
    newValue: "shipped",
    justification: params.justification ?? null,
  });
}

export async function markDelivered(params: {
  orderId: string;
  actor: Actor;
  justification?: string;
}): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { physicalItem: true },
  });
  if (!order) throw new FulfillmentError("Commande introuvable.", 404);
  if (order.status !== "shipped") {
    throw new FulfillmentError("Seule une commande expédiée peut être marquée livrée.", 409);
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.physicalItem.update({
      where: { orderId: order.id },
      data: { status: "delivered", deliveredAt: now },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: "delivered" } });
  });

  await audit({
    actor: params.actor,
    action: "order_delivered",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    oldValue: "shipped",
    newValue: "delivered",
    justification: params.justification ?? null,
  });
}

// ---------------------------------------------------------------------------
// Remboursement (mode test)
// ---------------------------------------------------------------------------

export async function refundOrder(params: {
  orderId: string;
  actor: Actor;
  justification: string;
}): Promise<{ ok: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true, tokenMint: true },
  });
  if (!order || !order.payment) throw new FulfillmentError("Commande introuvable.", 404);
  if (order.payment.status !== "succeeded") {
    throw new FulfillmentError("Seul un paiement confirmé peut être remboursé.", 409);
  }

  const { getPaymentProvider } = await import("@/lib/providers/payment");
  // Le remboursement passe par le fournisseur qui a encaissé le paiement.
  const provider = getPaymentProvider();
  const result =
    provider.name === order.payment.provider
      ? await provider.refund({
          provider: order.payment.provider,
          stripePaymentIntentId: order.payment.stripePaymentIntentId,
          amount: order.payment.amount,
          currency: order.payment.currency,
        })
      : { ok: true as const, refundId: `manual_${order.id}` };

  if (!result.ok) {
    await logError({
      service: "stripe",
      type: "refund_failed",
      message: `Remboursement échoué (commande ${order.publicId}).`,
      technicalMessage: result.error,
      orderId: order.id,
    });
    return { ok: false, error: result.error };
  }

  const now = new Date();
  const tokenAlreadyMinted = order.tokenMint?.status === "transfer_confirmed";
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: "refunded", refundedAt: now },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "refunded", refundedAt: now, needsReview: tokenAlreadyMinted },
    });
  });

  await audit({
    actor: params.actor,
    action: "order_refunded",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    oldValue: order.status,
    newValue: "refunded",
    justification: params.justification,
  });

  if (tokenAlreadyMinted) {
    await logError({
      service: "mint",
      type: "refund_with_minted_token",
      severity: "warning",
      message: `Commande ${order.publicId} remboursée alors que le token a déjà été émis — vérification manuelle requise.`,
      orderId: order.id,
    });
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Annulation d'opérations non exécutées
// ---------------------------------------------------------------------------

export async function cancelPendingOperation(params: {
  orderId: string;
  target: "hedging" | "mint";
  actor: Actor;
  justification?: string;
}): Promise<void> {
  if (params.target === "hedging") {
    const hedging = await prisma.hedgingOrder.findUnique({ where: { orderId: params.orderId } });
    if (!hedging || hedging.status === "simulated_filled") {
      throw new FulfillmentError("Aucune couverture annulable pour cette commande.", 409);
    }
    await prisma.hedgingOrder.update({
      where: { id: hedging.id },
      data: { status: "cancelled" },
    });
  } else {
    const mint = await prisma.tokenMint.findUnique({ where: { orderId: params.orderId } });
    if (!mint || mint.status === "transfer_confirmed") {
      throw new FulfillmentError("Aucune émission annulable pour cette commande.", 409);
    }
    await prisma.tokenMint.update({ where: { id: mint.id }, data: { status: "cancelled" } });
  }

  await audit({
    actor: params.actor,
    action: `${params.target}_cancelled`,
    entityType: params.target === "hedging" ? "HedgingOrder" : "TokenMint",
    entityId: params.orderId,
    orderId: params.orderId,
    justification: params.justification ?? null,
  });
}

// ---------------------------------------------------------------------------
// Vente (rachat de l'action + destruction du token)
// ---------------------------------------------------------------------------

/**
 * Le détenteur demande la revente de `quantity` tokens d'un actif. On vérifie
 * qu'il les détient réellement, on crée l'ordre de vente et on transmet au
 * courtier. En mode manuel, l'ordre reste « en attente » jusqu'à ce que
 * l'opérateur vende l'action réelle et saisisse le prix (confirmSellPrice).
 * En mode simulé, la vente est exécutée puis le token est détruit aussitôt.
 */
export async function requestSell(params: {
  userId: string;
  assetId: string;
  quantity: number;
  actor: Actor;
}): Promise<{ ok: boolean; sellOrderId?: string; pending?: boolean; error?: string }> {
  if (!Number.isInteger(params.quantity) || params.quantity < 1) {
    throw new FulfillmentError("Quantité de vente invalide.", 400);
  }

  const asset = await prisma.asset.findUnique({ where: { id: params.assetId } });
  if (!asset) throw new FulfillmentError("Actif introuvable.", 404);

  const wallet = await prisma.wallet.findFirst({ where: { userId: params.userId } });
  if (!wallet) throw new FulfillmentError("Aucun wallet enregistré.", 409);

  const sellable = await getSellableQuantity(params.userId, params.assetId);
  if (params.quantity > sellable) {
    throw new FulfillmentError(
      `Vous ne pouvez vendre que ${sellable} token(s) de ${asset.ticker}.`,
      409,
    );
  }

  let quote;
  try {
    quote = await getMarketDataProviderSafe(asset.ticker);
  } catch {
    quote = { price: asset.basePrice, currency: asset.currency };
  }

  const broker = getBrokerProvider();
  const sellOrder = await prisma.sellOrder.create({
    data: {
      publicId: generateOrderPublicId().replace("ORD-", "SELL-"),
      userId: params.userId,
      assetId: asset.id,
      ticker: asset.ticker,
      quantity: params.quantity,
      walletAddress: wallet.address,
      referencePrice: quote.price,
      currency: asset.currency,
      status: "pending_broker",
      provider: broker.name,
      idempotencyKey: `burn:${generatePublicToken()}`,
    },
  });

  await audit({
    actor: params.actor,
    action: "sell_requested",
    entityType: "SellOrder",
    entityId: sellOrder.id,
    newValue: JSON.stringify({ ticker: asset.ticker, quantity: params.quantity }),
  });

  const result = await broker.sellAsset({
    sellOrderId: sellOrder.id,
    ticker: asset.ticker,
    quantity: params.quantity,
    referencePrice: quote.price,
    currency: asset.currency,
  });

  if (!result.ok) {
    await prisma.sellOrder.update({
      where: { id: sellOrder.id },
      data: { status: "failed", lastError: result.error ?? "Erreur courtier inconnue" },
    });
    return { ok: false, error: result.error };
  }

  // Courtier manuel : attente de l'exécution réelle + saisie du prix.
  if (result.pending) {
    await prisma.sellOrder.update({
      where: { id: sellOrder.id },
      data: { status: "pending_broker", brokerRef: result.brokerRef ?? null },
    });
    return { ok: true, sellOrderId: sellOrder.id, pending: true };
  }

  // Courtier simulé : vente exécutée immédiatement, on enchaîne sur le burn.
  const executedPrice = result.executedPrice ?? quote.price;
  await prisma.sellOrder.update({
    where: { id: sellOrder.id },
    data: {
      status: "sold_pending_burn",
      brokerRef: result.brokerRef ?? null,
      executedPrice,
      proceedsAmount: executedPrice * params.quantity,
      executedAt: result.executedAt ?? new Date(),
    },
  });
  const burned = await runBurn(sellOrder.id, params.actor);
  return { ok: burned.ok, sellOrderId: sellOrder.id, error: burned.error };
}

/**
 * L'opérateur a vendu l'action réelle chez le courtier (mode manuel) et saisit
 * le prix obtenu. On enregistre le produit de la vente puis on détruit le token.
 */
export async function confirmSellPrice(params: {
  sellOrderId: string;
  executedPrice: number;
  actor: Actor;
}): Promise<{ ok: boolean; error?: string }> {
  const sellOrder = await prisma.sellOrder.findUnique({ where: { id: params.sellOrderId } });
  if (!sellOrder) throw new FulfillmentError("Ordre de vente introuvable.", 404);
  if (!["pending_broker", "failed"].includes(sellOrder.status)) {
    throw new FulfillmentError(
      `Cet ordre n'attend pas de prix de vente (statut « ${sellOrder.status} »).`,
      409,
    );
  }
  if (!Number.isFinite(params.executedPrice) || params.executedPrice <= 0) {
    throw new FulfillmentError("Prix de vente invalide.", 400);
  }

  await prisma.sellOrder.update({
    where: { id: sellOrder.id },
    data: {
      status: "sold_pending_burn",
      executedPrice: params.executedPrice,
      proceedsAmount: params.executedPrice * sellOrder.quantity,
      executedAt: new Date(),
      lastError: null,
    },
  });

  await audit({
    actor: params.actor,
    action: "sell_price_confirmed",
    entityType: "SellOrder",
    entityId: sellOrder.id,
    newValue: JSON.stringify({ executedPrice: params.executedPrice }),
  });

  return runBurn(sellOrder.id, params.actor);
}

/**
 * Détruit (burn) les tokens de l'ordre de vente sur la blockchain. Idempotent
 * via la clé unique de l'ordre. Enregistre la transaction et finalise la vente.
 */
export async function runBurn(
  sellOrderId: string,
  actor: Actor = SYSTEM_ACTOR,
  options?: { simulateFailure?: boolean },
): Promise<{ ok: boolean; alreadyDone?: boolean; error?: string }> {
  const sellOrder = await prisma.sellOrder.findUnique({
    where: { id: sellOrderId },
    include: { asset: true },
  });
  if (!sellOrder) throw new FulfillmentError("Ordre de vente introuvable.", 404);
  if (sellOrder.status === "completed") return { ok: true, alreadyDone: true };
  if (!["sold_pending_burn", "burning", "failed"].includes(sellOrder.status)) {
    throw new FulfillmentError(
      `La vente doit être exécutée chez le courtier avant destruction (statut « ${sellOrder.status} »).`,
      409,
    );
  }

  const chain = getBlockchainProvider();
  await prisma.sellOrder.update({
    where: { id: sellOrder.id },
    data: { status: "burning", attempts: { increment: 1 }, lastError: null },
  });

  const result = await chain.burnFrom({
    idempotencyKey: sellOrder.idempotencyKey,
    tokenId: sellOrder.asset.tokenId,
    quantity: sellOrder.quantity,
    fromAddress: sellOrder.walletAddress,
    simulateFailure: options?.simulateFailure,
  });

  if (!result.ok) {
    await prisma.$transaction(async (tx) => {
      await tx.sellOrder.update({
        where: { id: sellOrder.id },
        data: { status: "failed", lastError: result.error ?? "Erreur blockchain inconnue" },
      });
      await tx.blockchainTransaction.create({
        data: {
          type: "burn",
          network: chain.network,
          fromAddress: sellOrder.walletAddress,
          toAddress: "0x0000000000000000000000000000000000000000",
          tokenId: sellOrder.asset.tokenId,
          quantity: sellOrder.quantity,
          txHash: result.txHash ?? null,
          status: "failed",
          error: result.error ?? null,
        },
      });
    });
    await logError({
      service: "blockchain",
      type: "burn_failed",
      severity: "critical",
      message: `Destruction du token ${sellOrder.ticker} échouée (vente ${sellOrder.publicId}).`,
      technicalMessage: result.error,
      userId: sellOrder.userId,
    });
    return { ok: false, error: result.error };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.sellOrder.update({
      where: { id: sellOrder.id },
      data: {
        status: "completed",
        burnTxHash: result.txHash ?? null,
        burnBlockNumber: result.blockNumber ?? null,
        burnConfirmations: result.confirmations ?? 1,
        burnFeeWei: result.feeWei ?? null,
      },
    });
    await tx.blockchainTransaction.create({
      data: {
        type: "burn",
        network: chain.network,
        fromAddress: sellOrder.walletAddress,
        toAddress: "0x0000000000000000000000000000000000000000",
        tokenId: sellOrder.asset.tokenId,
        quantity: sellOrder.quantity,
        txHash: result.txHash ?? null,
        blockNumber: result.blockNumber ?? null,
        status: "confirmed",
        confirmations: result.confirmations ?? 1,
        feeWei: result.feeWei ?? null,
        confirmedAt: now,
      },
    });
  });

  await audit({
    actor,
    action: "token_burned",
    entityType: "SellOrder",
    entityId: sellOrder.id,
    newValue: JSON.stringify({
      tokenId: sellOrder.asset.tokenId,
      quantity: sellOrder.quantity,
      txHash: result.txHash,
    }),
  });

  return { ok: true };
}

/** Cotation sûre : retourne prix + devise, ou lève. */
async function getMarketDataProviderSafe(
  ticker: string,
): Promise<{ price: number; currency: string }> {
  const { getMarketDataProvider } = await import("@/lib/providers/market");
  const quote = await getMarketDataProvider().getQuote(ticker);
  return { price: quote.price, currency: quote.currency };
}

// ---------------------------------------------------------------------------
// Gestion des erreurs de traitement webhook
// ---------------------------------------------------------------------------

export async function handleWebhookProcessingError(
  orderId: string | undefined,
  error: unknown,
): Promise<void> {
  await logError({
    service: "stripe",
    type: "webhook_processing_error",
    severity: "critical",
    message: "Erreur lors du traitement d'un webhook de paiement.",
    technicalMessage: safeErrorMessage(error),
    orderId,
  });
}
