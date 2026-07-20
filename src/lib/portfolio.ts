/**
 * Vue portefeuille du client : positions agrégées par actif à partir des
 * tokens effectivement émis (mint confirmé), valorisation indicative au prix
 * simulé courant et variation par rapport au prix d'achat.
 */
import "server-only";
import { prisma } from "@/lib/db";
import { getMarketDataProvider } from "@/lib/providers/market";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";

/** Statuts de commande pour lesquels le client détient réellement le token. */
export const TOKEN_HELD_STATUSES = ["minted", "shipping_pending", "shipped", "delivered"];

export interface PortfolioPosition {
  assetId: string;
  ticker: string;
  name: string;
  indexName: string;
  currency: string;
  tokenId: number;
  quantity: number;
  /** Prix d'achat unitaire moyen (marge incluse). */
  avgPurchasePrice: number;
  invested: number;
  currentPrice: number;
  currentValue: number;
  /** Variation simulée vs prix d'achat (fraction). */
  changeSincePurchase: number;
  change24h: number;
}

export interface PortfolioSummary {
  positions: PortfolioPosition[];
  /** Totaux par devise (le portefeuille peut mêler EUR, USD, JPY). */
  totals: { currency: string; invested: number; value: number }[];
}

export async function getPortfolio(userId: string): Promise<PortfolioSummary> {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: TOKEN_HELD_STATUSES },
      tokenMint: { status: "transfer_confirmed" },
    },
    include: { items: { include: { asset: true } } },
  });

  type Acc = {
    asset: (typeof orders)[number]["items"][number]["asset"];
    quantity: number;
    invested: number;
  };
  const byAsset = new Map<string, Acc>();
  for (const order of orders) {
    for (const item of order.items) {
      const acc = byAsset.get(item.assetId) ?? { asset: item.asset, quantity: 0, invested: 0 };
      acc.quantity += item.quantity;
      acc.invested += convertToEuro(item.unitSellingPrice * item.quantity, item.currency);
      byAsset.set(item.assetId, acc);
    }
  }

  const tickers = Array.from(byAsset.values()).map((a) => a.asset.ticker);
  const quotes = await getMarketDataProvider().getQuotes(tickers);

  const positions: PortfolioPosition[] = [];
  for (const { asset, quantity, invested } of byAsset.values()) {
    const quote = quotes.get(asset.ticker);
    const currentPrice = convertToEuro(
      quote?.price ?? asset.basePrice,
      quote?.currency ?? asset.currency,
    );
    const avgPurchasePrice = quantity > 0 ? invested / quantity : 0;
    const currentValue = currentPrice * quantity;
    positions.push({
      assetId: asset.id,
      ticker: asset.ticker,
      name: asset.name,
      indexName: asset.indexName,
      currency: EURO_CURRENCY,
      tokenId: asset.tokenId,
      quantity,
      avgPurchasePrice,
      invested,
      currentPrice,
      currentValue,
      changeSincePurchase: avgPurchasePrice > 0 ? currentPrice / avgPurchasePrice - 1 : 0,
      change24h: quote?.changePercent24h ?? 0,
    });
  }
  positions.sort((a, b) => b.currentValue - a.currentValue);

  const totalsMap = new Map<string, { invested: number; value: number }>();
  for (const p of positions) {
    const t = totalsMap.get(p.currency) ?? { invested: 0, value: 0 };
    t.invested += p.invested;
    t.value += p.currentValue;
    totalsMap.set(p.currency, t);
  }

  return {
    positions,
    totals: Array.from(totalsMap.entries()).map(([currency, t]) => ({ currency, ...t })),
  };
}
