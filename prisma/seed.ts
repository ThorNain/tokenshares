/**
 * Données de démonstration (section 27) :
 *  - 15 actifs (S&P 500, CAC 40, Nikkei 225) ;
 *  - 20 clients fictifs + 30 wallets ;
 *  - 100 commandes couvrant tous les états du pipeline, dont 8 scénarios
 *    fixes (ORD-DEMO01 à ORD-DEMO08) documentés dans le README ;
 *  - paiements, couvertures simulées, mints, transactions blockchain,
 *    QR codes, expéditions, journaux d'audit et erreurs simulées.
 *
 * Exécution : npm run seed   (⚠ vide toutes les tables au préalable)
 * Le script est autonome (aucun import applicatif) et déterministe.
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// --- Générateur pseudo-aléatoire déterministe (reproductibilité) -------------
let seedState = 20260717;
function rand(): number {
  seedState = (Math.imul(seedState, 1664525) + 1013904223) >>> 0;
  return seedState / 0xffffffff;
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)] as T;
}
function hex(length: number): string {
  let out = "";
  while (out.length < length) out += Math.floor(rand() * 16).toString(16);
  return out.slice(0, length);
}
function fakeTxHash(): string {
  return `0x${hex(64)}`;
}
function demoWalletAddress(seed: string): string {
  return "0x" + createHash("sha256").update(`demo-wallet:${seed}`).digest("hex").slice(0, 40);
}
function roundC(value: number, currency: string): number {
  return currency === "JPY" ? Math.round(value) : Math.round(value * 100) / 100;
}
function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

// --- Catalogue -----------------------------------------------------------------
const ASSETS = [
  { ticker: "AAPL", name: "Apple", indexName: "SP500", country: "États-Unis", currency: "USD", basePrice: 212, initials: "AA", totemEmoji: "🍎", totemName: "Pendentif pomme en argent", totemImage: "/totems/aapl.webp" },
  { ticker: "MSFT", name: "Microsoft", indexName: "SP500", country: "États-Unis", currency: "USD", basePrice: 428, initials: "MS", totemEmoji: "🪟", totemName: "Fenêtre quadricolore en verre" },
  { ticker: "NVDA", name: "Nvidia", indexName: "SP500", country: "États-Unis", currency: "USD", basePrice: 122, initials: "NV", totemEmoji: "⚡", totemName: "Puce graphique sous résine" },
  { ticker: "AMZN", name: "Amazon", indexName: "SP500", country: "États-Unis", currency: "USD", basePrice: 186, initials: "AM", totemEmoji: "📦", totemName: "Mini colis en métal brossé" },
  { ticker: "KO", name: "Coca-Cola", indexName: "SP500", country: "États-Unis", currency: "USD", basePrice: 64, initials: "KO", totemEmoji: "🥤", totemName: "Bouteille iconique miniature en verre" },
  { ticker: "MC.PA", name: "LVMH", indexName: "CAC40", country: "France", currency: "EUR", basePrice: 715, initials: "LV", totemEmoji: "👜", totemName: "Malle de voyage miniature en cuir", totemImage: "/totems/mc-pa.webp" },
  { ticker: "TTE.PA", name: "TotalEnergies", indexName: "CAC40", country: "France", currency: "EUR", basePrice: 62, initials: "TE", totemEmoji: "⛽", totemName: "Pompe à essence rétro miniature" },
  { ticker: "AIR.PA", name: "Airbus", indexName: "CAC40", country: "France", currency: "EUR", basePrice: 152, initials: "AI", totemEmoji: "✈️", totemName: "A350 miniature en métal" },
  { ticker: "SU.PA", name: "Schneider Electric", indexName: "CAC40", country: "France", currency: "EUR", basePrice: 228, initials: "SE", totemEmoji: "🔌", totemName: "Interrupteur vintage miniature" },
  { ticker: "OR.PA", name: "L'Oréal", indexName: "CAC40", country: "France", currency: "EUR", basePrice: 432, initials: "OR", totemEmoji: "💄", totemName: "Rouge à lèvres doré miniature" },
  { ticker: "7203.T", name: "Toyota", indexName: "NIKKEI225", country: "Japon", currency: "JPY", basePrice: 2850, initials: "TO", totemEmoji: "🚗", totemName: "Toyota miniature die-cast" },
  { ticker: "6758.T", name: "Sony Group", indexName: "NIKKEI225", country: "Japon", currency: "JPY", basePrice: 13400, initials: "SO", totemEmoji: "🎧", totemName: "Walkman miniature à clip" },
  { ticker: "7974.T", name: "Nintendo", indexName: "NIKKEI225", country: "Japon", currency: "JPY", basePrice: 8300, initials: "NI", totemEmoji: "🍄", totemName: "Champignon de jeu miniature", totemImage: "/totems/nintendo-mushroom.png" },
  { ticker: "9984.T", name: "SoftBank Group", indexName: "NIKKEI225", country: "Japon", currency: "JPY", basePrice: 9200, initials: "SB", totemEmoji: "🤖", totemName: "Robot compagnon miniature" },
  { ticker: "9983.T", name: "Fast Retailing", indexName: "NIKKEI225", country: "Japon", currency: "JPY", basePrice: 41500, initials: "FR", totemEmoji: "🧥", totemName: "Doudoune miniature sur cintre" },
] as const;

const FIRST_NAMES = ["Claire", "Julien", "Sophie", "Nicolas", "Camille", "Thomas", "Léa", "Antoine", "Emma", "Lucas", "Chloé", "Hugo", "Manon", "Louis", "Inès", "Arthur", "Jade", "Paul", "Alice", "Nathan"] as const;
const LAST_NAMES = ["Dupont", "Martin", "Bernard", "Petit", "Robert", "Richard", "Durand", "Moreau", "Laurent", "Simon", "Michel", "Lefèvre", "Roux", "Fournier", "Girard", "Bonnet", "Lambert", "Rousseau", "Vincent", "Muller"] as const;

const CITIES = [
  { city: "Paris", postalCode: "75008", line1: "12 avenue des Champs-Élysées" },
  { city: "Lyon", postalCode: "69002", line1: "5 rue de la République" },
  { city: "Bordeaux", postalCode: "33000", line1: "28 cours de l'Intendance" },
  { city: "Nantes", postalCode: "44000", line1: "3 rue Crébillon" },
  { city: "Lille", postalCode: "59000", line1: "17 rue Faidherbe" },
  { city: "Marseille", postalCode: "13001", line1: "41 la Canebière" },
] as const;

const MARGIN_RATE = 0.1;
const CHAIN_ID = Number(process.env.CHAIN_ID ?? "84532");
const NETWORK = "mock-testnet (simulation locale)";
const CONTRACT = process.env.TOKEN_CONTRACT_ADDRESS || "0xDEM0000000000000000000000000000000000000";
const MINTER = "0x000000000000000000000000000000000000dEaD";

type Stage =
  | "created"
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "hedge_pending"
  | "hedge_simulated"
  | "mint_pending"
  | "mint_failed"
  | "minted"
  | "shipping_pending"
  | "shipped"
  | "delivered"
  | "refunded"
  | "refunded_after_mint";

interface SeedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  walletAddress: string;
}

interface SeedAsset {
  id: string;
  ticker: string;
  name: string;
  currency: string;
  basePrice: number;
  tokenId: number;
}

let orderCounter = 0;

async function createDemoOrder(params: {
  user: SeedUser;
  asset: SeedAsset;
  quantity: number;
  stage: Stage;
  createdAt: Date;
  publicId?: string;
}): Promise<void> {
  const { user, asset, quantity, stage, createdAt } = params;
  orderCounter += 1;
  const publicId = params.publicId ?? `ORD-S${String(orderCounter).padStart(4, "0")}`;

  const marketPrice = roundC(asset.basePrice * (0.97 + rand() * 0.06), asset.currency);
  const unitSellingPrice = roundC(marketPrice * (1 + MARGIN_RATE), asset.currency);
  const subtotal = roundC(marketPrice * quantity, asset.currency);
  const total = roundC(unitSellingPrice * quantity, asset.currency);
  const marginAmount = roundC(total - subtotal, asset.currency);

  const hasPayment = stage !== "created";
  const isPaid = !["created", "pending_payment", "payment_failed"].includes(stage);
  const hasHedge = isPaid && stage !== "paid";
  const hedgeFilled =
    hasHedge && !["hedge_pending"].includes(stage);
  const hasMint = ["mint_pending", "mint_failed", "minted", "shipping_pending", "shipped", "delivered", "refunded_after_mint"].includes(stage);
  const mintConfirmed = ["minted", "shipping_pending", "shipped", "delivered", "refunded_after_mint"].includes(stage);
  const hasQr = ["minted", "shipping_pending", "shipped", "delivered", "refunded_after_mint"].includes(stage);
  const isRefunded = stage === "refunded" || stage === "refunded_after_mint";

  const orderStatus: string = {
    created: "created",
    pending_payment: "pending_payment",
    payment_failed: "pending_payment",
    paid: "paid",
    hedge_pending: "paid",
    hedge_simulated: "hedge_simulated",
    mint_pending: "mint_pending",
    mint_failed: "failed",
    minted: "minted",
    shipping_pending: "shipping_pending",
    shipped: "shipped",
    delivered: "delivered",
    refunded: "refunded",
    refunded_after_mint: "refunded",
  }[stage];

  const paidAt = isPaid ? minutesAfter(createdAt, 5) : null;
  const hedgeAt = hedgeFilled ? minutesAfter(createdAt, 7) : null;
  const mintAt = mintConfirmed ? minutesAfter(createdAt, 12) : null;
  const shippedAt = ["shipped", "delivered"].includes(stage) ? minutesAfter(createdAt, 60 * 24) : null;
  const deliveredAt = stage === "delivered" ? minutesAfter(createdAt, 60 * 24 * 4) : null;
  const refundedAt = isRefunded ? minutesAfter(createdAt, 60 * 5) : null;

  const order = await prisma.order.create({
    data: {
      publicId,
      userId: user.id,
      status: orderStatus,
      currency: asset.currency,
      subtotalAmount: subtotal,
      marginRate: MARGIN_RATE,
      marginAmount,
      totalAmount: total,
      needsReview: stage === "mint_failed" || stage === "refunded_after_mint",
      paidAt,
      refundedAt,
      createdAt,
      updatedAt: deliveredAt ?? shippedAt ?? mintAt ?? paidAt ?? createdAt,
      items: {
        create: {
          assetId: asset.id,
          quantity,
          lockedMarketPrice: marketPrice,
          unitSellingPrice,
          marginAmount,
          currency: asset.currency,
          priceLockedAt: createdAt,
        },
      },
    },
  });

  // Instantané de prix.
  await prisma.marketPrice.create({
    data: { assetId: asset.id, price: marketPrice, currency: asset.currency, source: "mock", asOf: createdAt, createdAt },
  });

  // Adresse (toutes les commandes sauf la moitié des « created »).
  if (stage !== "created" || rand() > 0.5) {
    const c = pick(CITIES);
    await prisma.shippingAddress.create({
      data: {
        orderId: order.id,
        firstName: user.firstName,
        lastName: user.lastName,
        line1: c.line1,
        postalCode: c.postalCode,
        city: c.city,
        country: "France",
        phone: rand() > 0.5 ? `+33 6 ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)}` : null,
      },
    });
  }

  // Paiement.
  if (hasPayment) {
    const paymentStatus = isRefunded
      ? "refunded"
      : stage === "payment_failed"
        ? "failed"
        : isPaid
          ? "succeeded"
          : "pending";
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: "mock",
        status: paymentStatus,
        amount: total,
        currency: asset.currency,
        amountReceived: isPaid ? total : null,
        method: isPaid ? "Carte bancaire (simulée)" : null,
        stripeSessionId: `mock_cs_seed_${publicId.toLowerCase()}`,
        webhookVerified: isPaid || stage === "payment_failed",
        paidAt,
        refundedAt,
        failureMessage: stage === "payment_failed" ? "Carte refusée (simulation seed)." : null,
        createdAt: minutesAfter(createdAt, 2),
      },
    });
    if (isPaid) {
      await prisma.webhookEvent.create({
        data: { provider: "mock", externalId: `seed_evt_${publicId}`, type: "payment_succeeded", orderId: order.id },
      });
    }
  }

  // Couverture simulée.
  if (hasHedge) {
    await prisma.hedgingOrder.create({
      data: {
        orderId: order.id,
        assetId: asset.id,
        ticker: asset.ticker,
        quantity,
        referencePrice: marketPrice,
        currency: asset.currency,
        notionalAmount: subtotal,
        status: hedgeFilled ? "simulated_filled" : "pending",
        brokerRef: hedgeFilled ? `SIM-${hex(10).toUpperCase()}` : null,
        attempts: hedgeFilled ? 1 : 0,
        executedAt: hedgeAt,
        createdAt: minutesAfter(createdAt, 6),
      },
    });
  }

  // Émission du token.
  if (hasMint) {
    const mintStatus = stage === "mint_pending" ? "minting" : stage === "mint_failed" ? "failed" : "transfer_confirmed";
    const txHash = mintConfirmed ? fakeTxHash() : null;
    const blockNumber = mintConfirmed ? 10_000_000 + randInt(100_000, 900_000) : null;
    const mint = await prisma.tokenMint.create({
      data: {
        orderId: order.id,
        assetId: asset.id,
        tokenId: asset.tokenId,
        contractAddress: CONTRACT,
        network: NETWORK,
        quantity,
        toAddress: user.walletAddress,
        status: mintStatus,
        txHash,
        blockNumber,
        confirmations: mintConfirmed ? 12 : 0,
        feeWei: mintConfirmed ? "31500000000000" : null,
        attempts: stage === "mint_failed" ? 2 : 1,
        lastError: stage === "mint_failed" ? "Erreur RPC simulée : insufficient funds for gas (seed)" : null,
        submittedAt: mintAt,
        confirmedAt: mintAt,
        idempotencyKey: `mint:${order.id}`,
        createdAt: minutesAfter(createdAt, 10),
      },
    });
    await prisma.blockchainTransaction.create({
      data: {
        orderId: order.id,
        tokenMintId: mint.id,
        type: "mint",
        network: NETWORK,
        fromAddress: MINTER,
        toAddress: user.walletAddress,
        tokenId: asset.tokenId,
        quantity,
        txHash: mintConfirmed ? txHash : stage === "mint_failed" ? null : null,
        blockNumber,
        status: mintConfirmed ? "confirmed" : stage === "mint_failed" ? "failed" : "submitted",
        confirmations: mintConfirmed ? 12 : 0,
        feeWei: mintConfirmed ? "31500000000000" : null,
        error: stage === "mint_failed" ? "Erreur RPC simulée : insufficient funds for gas (seed)" : null,
        confirmedAt: mintAt,
        createdAt: minutesAfter(createdAt, 11),
      },
    });
    if (stage === "mint_failed") {
      await prisma.errorLog.create({
        data: {
          service: "blockchain",
          type: "mint_failed",
          severity: "critical",
          message: `Émission du token ${asset.ticker} échouée (commande ${publicId}).`,
          technicalMessage: "Erreur RPC simulée : insufficient funds for gas (seed)",
          orderId: order.id,
          attempts: 2,
          lastAttemptAt: minutesAfter(createdAt, 12),
          createdAt: minutesAfter(createdAt, 12),
        },
      });
    }
  }

  // QR code + objet physique.
  if (hasQr) {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const claimCode = Array.from({ length: 8 }, () => alphabet[randInt(0, alphabet.length - 1)]).join("");
    await prisma.qrCode.create({
      data: {
        orderId: order.id,
        publicToken: claimCode,
        active: true,
        createdAt: minutesAfter(createdAt, 15),
      },
    });
    const physicalStatus = stage === "delivered" ? "delivered" : stage === "shipped" ? "shipped" : "preparing";
    await prisma.physicalItem.create({
      data: {
        orderId: order.id,
        kind: "miniature_car",
        status: physicalStatus,
        carrier: shippedAt ? "Colissimo (démo)" : null,
        trackingNumber: shippedAt ? `DEMO-${hex(10).toUpperCase()}` : null,
        shippedAt,
        estimatedDeliveryAt: shippedAt ? minutesAfter(shippedAt, 60 * 24 * 4) : null,
        deliveredAt,
        createdAt: minutesAfter(createdAt, 15),
      },
    });
  }

  // Remboursement avec token déjà émis → alerte de rapprochement.
  if (stage === "refunded_after_mint") {
    await prisma.errorLog.create({
      data: {
        service: "mint",
        type: "refund_with_minted_token",
        severity: "warning",
        message: `Commande ${publicId} remboursée alors que le token a déjà été émis — vérification manuelle requise.`,
        orderId: order.id,
        createdAt: refundedAt ?? createdAt,
      },
    });
  }

  // Journal d'audit minimal mais cohérent avec la timeline.
  const audits: { action: string; entityType: string; at: Date; actorType: string; actorEmail?: string; oldValue?: string; newValue?: string }[] = [
    { action: "order_created", entityType: "Order", at: createdAt, actorType: "user", actorEmail: user.email },
  ];
  if (hasPayment) audits.push({ action: "payment_initiated", entityType: "Payment", at: minutesAfter(createdAt, 2), actorType: "user", actorEmail: user.email });
  if (isPaid) audits.push({ action: "payment_confirmed", entityType: "Payment", at: paidAt!, actorType: "system", oldValue: "pending", newValue: "succeeded" });
  if (hedgeFilled) audits.push({ action: "hedging_simulated_filled", entityType: "HedgingOrder", at: hedgeAt!, actorType: "system" });
  if (mintConfirmed) audits.push({ action: "token_minted", entityType: "TokenMint", at: mintAt!, actorType: "system" });
  if (hasQr) audits.push({ action: "qr_generated", entityType: "QrCode", at: minutesAfter(createdAt, 15), actorType: "system" });
  if (shippedAt) audits.push({ action: "order_shipped", entityType: "Order", at: shippedAt, actorType: "admin", actorEmail: process.env.ADMIN_EMAIL ?? "admin@example.test", oldValue: "shipping_pending", newValue: "shipped" });
  if (deliveredAt) audits.push({ action: "order_delivered", entityType: "Order", at: deliveredAt, actorType: "admin", actorEmail: process.env.ADMIN_EMAIL ?? "admin@example.test", oldValue: "shipped", newValue: "delivered" });
  if (isRefunded) audits.push({ action: "order_refunded", entityType: "Order", at: refundedAt!, actorType: "admin", actorEmail: process.env.ADMIN_EMAIL ?? "admin@example.test", newValue: "refunded" });

  for (const a of audits) {
    await prisma.auditLog.create({
      data: {
        actorType: a.actorType,
        actorEmail: a.actorEmail ?? null,
        action: a.action,
        entityType: a.entityType,
        entityId: order.id,
        orderId: order.id,
        oldValue: a.oldValue ?? null,
        newValue: a.newValue ?? null,
        createdAt: a.at,
      },
    });
  }
}

async function main() {
  console.log("🧹 Purge des tables…");
  await prisma.auditLog.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.blockchainTransaction.deleteMany();
  await prisma.sellOrder.deleteMany();
  await prisma.tokenMint.deleteMany();
  await prisma.hedgingOrder.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.qrCode.deleteMany();
  await prisma.physicalItem.deleteMany();
  await prisma.shippingAddress.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.setting.deleteMany();

  console.log("⚙️  Paramètres globaux…");
  await prisma.setting.createMany({
    data: [
      { key: "margin_rate", value: String(MARGIN_RATE) },
      { key: "orders_paused", value: "false" },
    ],
  });

  console.log("👤 Compte administrateur…");
  await prisma.user.create({
    data: {
      email: (process.env.ADMIN_EMAIL ?? "admin@example.test").toLowerCase(),
      role: "admin",
      firstName: "Admin",
      lastName: "Démo",
    },
  });

  console.log("📈 15 actifs…");
  const assets: SeedAsset[] = [];
  for (let i = 0; i < ASSETS.length; i++) {
    const a = ASSETS[i]!;
    const created = await prisma.asset.create({
      data: { ...a, tokenId: i + 1, active: true },
    });
    assets.push({
      id: created.id,
      ticker: created.ticker,
      name: created.name,
      currency: created.currency,
      basePrice: created.basePrice,
      tokenId: created.tokenId,
    });
  }

  console.log("👥 20 clients + 30 wallets…");
  const users: SeedUser[] = [];
  for (let i = 0; i < 20; i++) {
    const firstName = FIRST_NAMES[i]!;
    const lastName = LAST_NAMES[i]!;
    const email = `${firstName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@example.test`;
    const createdAt = new Date(Date.now() - randInt(10, 180) * 24 * 3600 * 1000);
    const user = await prisma.user.create({
      data: { email, firstName, lastName, role: "customer", createdAt },
    });
    const walletAddress = demoWalletAddress(email);
    await prisma.wallet.create({
      data: { userId: user.id, address: walletAddress, chainId: CHAIN_ID, provider: "demo", createdAt },
    });
    // 10 clients ont un second wallet (30 wallets au total).
    if (i < 10) {
      await prisma.wallet.create({
        data: {
          userId: user.id,
          address: demoWalletAddress(`${email}:secondary`),
          chainId: CHAIN_ID,
          provider: "demo",
          createdAt,
        },
      });
    }
    users.push({ id: user.id, email, firstName, lastName, walletAddress });
  }

  console.log("🧾 100 commandes…");
  const distribution: [Stage, number][] = [
    ["created", 5],
    ["pending_payment", 8],
    ["payment_failed", 5],
    ["paid", 4],
    ["hedge_pending", 3],
    ["hedge_simulated", 4],
    ["mint_pending", 3],
    ["mint_failed", 4],
    ["minted", 5],
    ["shipping_pending", 10],
    ["shipped", 12],
    ["delivered", 24],
    ["refunded", 4],
    ["refunded_after_mint", 1],
  ];

  const jobs: { stage: Stage; user: SeedUser; asset: SeedAsset; createdAt: Date }[] = [];
  for (const [stage, count] of distribution) {
    for (let i = 0; i < count; i++) {
      jobs.push({
        stage,
        user: pick(users),
        asset: pick(assets),
        createdAt: new Date(Date.now() - randInt(2, 90) * 24 * 3600 * 1000 - randInt(0, 86_400) * 1000),
      });
    }
  }
  jobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const job of jobs) {
    await createDemoOrder({ ...job, quantity: randInt(1, 3) });
  }

  console.log("🎯 8 commandes de scénario (ORD-DEMO01 → ORD-DEMO08)…");
  const demoUser = users[0]!; // claire.dupont@example.test
  const byTicker = (t: string) => assets.find((a) => a.ticker === t)!;
  const day = 24 * 3600 * 1000;
  const scenarios: { publicId: string; stage: Stage; ticker: string; daysAgo: number }[] = [
    { publicId: "ORD-DEMO01", stage: "delivered", ticker: "AAPL", daysAgo: 7 },
    { publicId: "ORD-DEMO02", stage: "payment_failed", ticker: "MSFT", daysAgo: 6 },
    { publicId: "ORD-DEMO03", stage: "hedge_pending", ticker: "MC.PA", daysAgo: 5 },
    { publicId: "ORD-DEMO04", stage: "mint_pending", ticker: "NVDA", daysAgo: 4 },
    { publicId: "ORD-DEMO05", stage: "mint_failed", ticker: "7203.T", daysAgo: 3 },
    { publicId: "ORD-DEMO06", stage: "refunded", ticker: "TTE.PA", daysAgo: 3 },
    { publicId: "ORD-DEMO07", stage: "shipping_pending", ticker: "OR.PA", daysAgo: 2 },
    { publicId: "ORD-DEMO08", stage: "shipped", ticker: "6758.T", daysAgo: 1 },
  ];
  for (const s of scenarios) {
    await createDemoOrder({
      user: demoUser,
      asset: byTicker(s.ticker),
      quantity: 1,
      stage: s.stage,
      createdAt: new Date(Date.now() - s.daysAgo * day),
      publicId: s.publicId,
    });
  }

  console.log("🐞 Erreurs simulées additionnelles…");
  await prisma.errorLog.createMany({
    data: [
      {
        service: "privy",
        type: "token_verification_failed",
        severity: "warning",
        message: "Échec de vérification d'un access token Privy (simulation seed).",
        attempts: 1,
      },
      {
        service: "stripe",
        type: "webhook_signature_invalid",
        severity: "critical",
        message: "Webhook Stripe rejeté : signature invalide (simulation seed).",
        resolved: true,
        resolvedAt: new Date(),
      },
      {
        service: "market-data",
        type: "quote_timeout",
        severity: "warning",
        message: "Délai dépassé lors de la récupération d'un prix indicatif (simulation seed).",
        attempts: 3,
        nextAttemptAt: new Date(Date.now() + 3600 * 1000),
      },
      {
        service: "qrcode",
        type: "qr_generation_slow",
        severity: "info",
        message: "Génération de QR code plus lente que la normale (simulation seed).",
        resolved: true,
        resolvedAt: new Date(),
      },
      {
        service: "shipping",
        type: "carrier_delay",
        severity: "warning",
        message: "Retard transporteur signalé sur une expédition (simulation seed).",
      },
      {
        service: "database",
        type: "slow_query",
        severity: "info",
        message: "Requête lente détectée sur la liste des commandes (simulation seed).",
        resolved: true,
        resolvedAt: new Date(),
      },
    ],
  });

  const counts = {
    users: await prisma.user.count(),
    wallets: await prisma.wallet.count(),
    assets: await prisma.asset.count(),
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    hedges: await prisma.hedgingOrder.count(),
    mints: await prisma.tokenMint.count(),
    txs: await prisma.blockchainTransaction.count(),
    qrs: await prisma.qrCode.count(),
    errors: await prisma.errorLog.count(),
    audits: await prisma.auditLog.count(),
  };
  console.log("\n✅ Seed terminé :", counts);
  console.log(`\nComptes de test :
  Client : ${demoUser.email} (connexion démo par e-mail, commandes ORD-DEMO01 → ORD-DEMO08)
  Admin  : ${process.env.ADMIN_EMAIL ?? "admin@example.test"} (mot de passe : variable ADMIN_PASSWORD du .env)\n`);
}

main()
  .catch((error) => {
    console.error("❌ Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
