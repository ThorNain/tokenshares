/**
 * Création de commande et initiation du paiement.
 * Le prix est FIGÉ au moment de la commande (instantané MarketPrice +
 * montants verrouillés sur OrderItem) ; le paiement facture exactement ce
 * montant. La confirmation ne vient que du webhook (jamais du navigateur).
 */
import "server-only";
import { prisma } from "@/lib/db";
import { audit, type Actor } from "@/lib/audit";
import { logError, safeErrorMessage } from "@/lib/error-log";
import { computeOrderLine } from "@/lib/pricing";
import { generateOrderPublicId } from "@/lib/public-token";
import { getMarketDataProvider } from "@/lib/providers/market";
import { getPaymentProvider } from "@/lib/providers/payment";
import { areOrdersPaused, getEffectiveMarginRate } from "@/lib/settings";
import { env } from "@/lib/env";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";

export class OrderError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

/** Crée une commande au prix du marché figé (statut `created`). */
export async function createOrder(params: {
  userId: string;
  ticker: string;
  quantity: number;
  isGift?: boolean;
  actor: Actor;
}) {
  const { userId, ticker, quantity, isGift, actor } = params;

  if (await areOrdersPaused()) {
    throw new OrderError(
      "Les nouvelles commandes sont temporairement suspendues. Veuillez réessayer plus tard.",
      503,
    );
  }

  const asset = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset || !asset.active) {
    throw new OrderError("Cet actif n'est pas disponible à l'achat.", 404);
  }

  let quote;
  try {
    quote = await getMarketDataProvider().getQuote(ticker);
  } catch (error) {
    await logError({
      service: "market-data",
      type: "quote_failed",
      message: `Impossible d'obtenir le prix indicatif de ${ticker}.`,
      technicalMessage: safeErrorMessage(error),
      userId,
    });
    throw new OrderError("Prix indicatif momentanément indisponible.", 503);
  }

  const marginRate = await getEffectiveMarginRate(asset.marginRateOverride);
  const euroMarketPrice = convertToEuro(quote.price, quote.currency);
  const line = computeOrderLine({
    marketPrice: euroMarketPrice,
    quantity,
    marginRate,
    currency: EURO_CURRENCY,
  });

  const order = await prisma.$transaction(async (tx) => {
    await tx.marketPrice.create({
      data: {
        assetId: asset.id,
        price: quote.price,
        currency: quote.currency,
        source: quote.source,
        asOf: quote.asOf,
      },
    });
    const created = await tx.order.create({
      data: {
        publicId: generateOrderPublicId(),
        userId,
        status: "created",
        isGift: isGift ?? false,
        currency: EURO_CURRENCY,
        subtotalAmount: line.subtotal,
        marginRate,
        marginAmount: line.marginAmount,
        totalAmount: line.total,
        items: {
          create: {
            assetId: asset.id,
            quantity,
            lockedMarketPrice: euroMarketPrice,
            unitSellingPrice: line.unitSellingPrice,
            marginAmount: line.marginAmount,
            currency: EURO_CURRENCY,
          },
        },
      },
      include: { items: true },
    });
    return created;
  });

  await audit({
    actor,
    action: "order_created",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    newValue: JSON.stringify({ ticker, quantity, total: line.total, currency: EURO_CURRENCY }),
  });

  return order;
}

/**
 * Met à jour l'adresse de livraison. Autorisé tant que la commande n'est pas
 * expédiée (ni remboursée/annulée). Journalisé avec ancienne/nouvelle valeur.
 */
export async function upsertShippingAddress(params: {
  orderId: string;
  userId: string;
  actor: Actor;
  address: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string | null;
    postalCode: string;
    city: string;
    country: string;
    phone?: string | null;
  };
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { shippingAddress: true, physicalItem: true },
  });
  if (!order || order.userId !== params.userId) {
    throw new OrderError("Commande introuvable.", 404);
  }
  if (order.physicalItem && ["shipped", "delivered"].includes(order.physicalItem.status)) {
    throw new OrderError("L'adresse ne peut plus être modifiée : la commande est expédiée.", 409);
  }
  if (["refunded", "cancelled"].includes(order.status)) {
    throw new OrderError("Commande clôturée : adresse non modifiable.", 409);
  }

  const oldValue = order.shippingAddress ? JSON.stringify(order.shippingAddress) : null;
  const address = await prisma.shippingAddress.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, ...params.address },
    update: { ...params.address },
  });

  await audit({
    actor: params.actor,
    action: "address_changed",
    entityType: "ShippingAddress",
    entityId: address.id,
    orderId: order.id,
    oldValue,
    newValue: JSON.stringify(params.address),
  });

  return address;
}

/**
 * Active/désactive le statut « cadeau » d'une commande. Autorisé uniquement
 * avant le paiement (le mode de fulfillment en dépend).
 */
export async function setOrderGift(params: {
  orderId: string;
  userId: string;
  isGift: boolean;
  actor: Actor;
}): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order || order.userId !== params.userId) {
    throw new OrderError("Commande introuvable.", 404);
  }
  if (!["created", "pending_payment"].includes(order.status)) {
    throw new OrderError("L'option cadeau n'est plus modifiable.", 409);
  }
  await prisma.order.update({ where: { id: order.id }, data: { isGift: params.isGift } });
  await audit({
    actor: params.actor,
    action: "order_gift_toggled",
    entityType: "Order",
    entityId: order.id,
    orderId: order.id,
    newValue: String(params.isGift),
  });
}

/**
 * Initie le paiement : crée/actualise le Payment, passe la commande en
 * `pending_payment` et retourne l'URL de la page de paiement (Stripe
 * Checkout en mode test, ou page simulée locale).
 */
export async function initiatePayment(params: {
  orderId: string;
  userId: string;
  userEmail: string;
  actor: Actor;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: { include: { asset: true } }, payment: true, shippingAddress: true },
  });
  if (!order || order.userId !== params.userId) {
    throw new OrderError("Commande introuvable.", 404);
  }
  if (!["created", "pending_payment"].includes(order.status)) {
    throw new OrderError("Cette commande ne peut plus être payée.", 409);
  }
  if (order.payment?.status === "succeeded") {
    throw new OrderError("Cette commande est déjà payée.", 409);
  }
  // Pour un cadeau, l'adresse est fournie plus tard par le destinataire lors
  // de la réclamation : elle n'est donc pas requise au paiement.
  if (!order.isGift && !order.shippingAddress) {
    throw new OrderError("Veuillez renseigner l'adresse de livraison avant le paiement.", 400);
  }

  const item = order.items[0];
  if (!item) throw new OrderError("Commande vide.", 500);

  const provider = getPaymentProvider();
  const description = `${item.quantity} × Token de démonstration ${item.asset.name} (${item.asset.ticker}) — commande ${order.publicId}`;

  const session = await provider.createCheckoutSession({
    orderId: order.id,
    orderPublicId: order.publicId,
    amount: order.totalAmount,
    currency: order.currency,
    customerEmail: params.userEmail,
    description,
    successUrl: `${env.appUrl}/checkout/${order.id}/confirmation`,
    cancelUrl: `${env.appUrl}/checkout/${order.id}?cancelled=1`,
  });

  await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        provider: session.provider,
        status: "pending",
        amount: order.totalAmount,
        currency: order.currency,
        stripeSessionId: session.sessionId,
      },
      update: {
        provider: session.provider,
        status: "pending",
        amount: order.totalAmount,
        stripeSessionId: session.sessionId,
        failureMessage: null,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "pending_payment" },
    });
  });

  await audit({
    actor: params.actor,
    action: "payment_initiated",
    entityType: "Payment",
    entityId: order.id,
    orderId: order.id,
    newValue: JSON.stringify({ provider: session.provider, sessionId: session.sessionId }),
  });

  return session;
}
