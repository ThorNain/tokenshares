/**
 * Rapprochement réserves / tokens (section 23) : pour chaque actif, compare
 * la quantité vendue aux clients, la quantité de tokens émis et la quantité
 * théoriquement couverte chez le courtier simulé.
 *
 *   coverageRatio = simulatedCoveredQuantity / tokenizedQuantity  (attendu : 100 %)
 */
import "server-only";
import { prisma } from "@/lib/db";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";

export interface ReserveRow {
  assetId: string;
  ticker: string;
  name: string;
  indexName: string;
  currency: string;
  soldQuantity: number;
  tokenizedQuantity: number;
  coveredQuantity: number;
  onChainQuantity: number;
  ordersValue: number;
  hedgesValue: number;
  /** coveredQuantity / tokenizedQuantity — null si aucun token émis. */
  coverageRatio: number | null;
  delta: number;
  alerts: string[];
  status: "ok" | "alert";
}

export interface ReservesReport {
  rows: ReserveRow[];
  globalAlerts: string[];
}

/** Commandes considérées comme « vendues » (payées, non remboursées). */
const SOLD_STATUSES = [
  "paid",
  "hedge_simulated",
  "mint_pending",
  "minted",
  "shipping_pending",
  "shipped",
  "delivered",
];

export async function getReservesReport(): Promise<ReservesReport> {
  const assets = await prisma.asset.findMany({ orderBy: { ticker: "asc" } });

  const [items, mints, hedges, chainTxs, failedHedges, refundedWithToken] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { status: { in: SOLD_STATUSES } } },
      select: { assetId: true, quantity: true, unitSellingPrice: true, currency: true },
    }),
    prisma.tokenMint.findMany({
      where: { status: "transfer_confirmed" },
      select: { assetId: true, quantity: true },
    }),
    prisma.hedgingOrder.findMany({
      where: { status: "simulated_filled" },
      select: { assetId: true, quantity: true, notionalAmount: true, currency: true },
    }),
    prisma.blockchainTransaction.findMany({
      where: { status: "confirmed", type: "mint" },
      select: { tokenId: true, quantity: true },
    }),
    prisma.hedgingOrder.findMany({
      where: { status: "failed" },
      select: { assetId: true },
    }),
    prisma.order.findMany({
      where: { status: "refunded", tokenMint: { status: "transfer_confirmed" } },
      select: { id: true, publicId: true, items: { select: { assetId: true } } },
    }),
  ]);

  const sum = <T>(rows: T[], key: (r: T) => string, val: (r: T) => number): Map<string, number> => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
    return m;
  };

  const soldByAsset = sum(items, (i) => i.assetId, (i) => i.quantity);
  const soldValueByAsset = sum(items, (i) => i.assetId, (i) =>
    convertToEuro(i.quantity * i.unitSellingPrice, i.currency),
  );
  const mintedByAsset = sum(mints, (m) => m.assetId, (m) => m.quantity);
  const hedgedByAsset = sum(hedges, (h) => h.assetId, (h) => h.quantity);
  const hedgedValueByAsset = sum(hedges, (h) => h.assetId, (h) =>
    convertToEuro(h.notionalAmount, h.currency),
  );
  const onChainByTokenId = sum(chainTxs, (t) => String(t.tokenId ?? -1), (t) => t.quantity ?? 0);
  const failedHedgeAssets = new Set(failedHedges.map((h) => h.assetId));
  const refundedAssets = new Set(refundedWithToken.flatMap((o) => o.items.map((i) => i.assetId)));

  const rows: ReserveRow[] = assets.map((asset) => {
    const sold = soldByAsset.get(asset.id) ?? 0;
    const tokenized = mintedByAsset.get(asset.id) ?? 0;
    const covered = hedgedByAsset.get(asset.id) ?? 0;
    const onChain = onChainByTokenId.get(String(asset.tokenId)) ?? 0;
    const ratio = tokenized > 0 ? covered / tokenized : null;
    const alerts: string[] = [];

    if (ratio !== null && ratio < 1) {
      alerts.push("Ratio de couverture inférieur à 100 %.");
    }
    if (tokenized > covered) {
      alerts.push("Plus de tokens émis que d'actifs couverts.");
    }
    if (failedHedgeAssets.has(asset.id)) {
      alerts.push("Au moins une opération de couverture a échoué.");
    }
    if (tokenized > 0 && covered === 0) {
      alerts.push("Token émis sans couverture associée.");
    }
    if (refundedAssets.has(asset.id)) {
      alerts.push("Commande remboursée alors que le token a été émis.");
    }
    if (tokenized !== onChain) {
      alerts.push(
        `Écart base de données / blockchain : ${tokenized} token(s) en base, ${onChain} confirmé(s) on-chain.`,
      );
    }

    return {
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      indexName: asset.indexName,
      currency: EURO_CURRENCY,
      soldQuantity: sold,
      tokenizedQuantity: tokenized,
      coveredQuantity: covered,
      onChainQuantity: onChain,
      ordersValue: soldValueByAsset.get(asset.id) ?? 0,
      hedgesValue: hedgedValueByAsset.get(asset.id) ?? 0,
      coverageRatio: ratio,
      delta: tokenized - covered,
      alerts,
      status: alerts.length > 0 ? "alert" : "ok",
    };
  });

  const globalAlerts: string[] = [];
  const alertCount = rows.filter((r) => r.status === "alert").length;
  if (alertCount > 0) {
    globalAlerts.push(`${alertCount} actif(s) présentent un écart de rapprochement.`);
  }
  for (const o of refundedWithToken) {
    globalAlerts.push(`Commande ${o.publicId} remboursée mais token non traité.`);
  }

  return { rows, globalAlerts };
}
