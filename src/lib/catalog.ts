/**
 * Catalogue côté serveur : actifs actifs + cotations simulées + prix finals
 * (marge incluse), prêts à être sérialisés vers les composants client.
 */
import "server-only";
import { prisma } from "@/lib/db";
import { getMarketDataProvider } from "@/lib/providers/market";
import { getMarginRate, getEffectiveMarginRate } from "@/lib/settings";
import { calculateSellingPrice, roundCurrency } from "@/lib/pricing";
import type { CatalogAsset } from "@/components/asset-catalog";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";
import { unstable_cache } from "next/cache";

async function computeCatalog(limit?: number): Promise<CatalogAsset[]> {
  const assets = await prisma.asset.findMany({
    where: { active: true },
    orderBy: [{ indexName: "asc" }, { name: "asc" }],
    ...(limit ? { take: limit } : {}),
  });
  if (assets.length === 0) return [];

  const globalMargin = await getMarginRate();
  const quotes = await getMarketDataProvider().getQuotes(assets.map((a) => a.ticker));

  return assets.map((asset) => {
    const quote = quotes.get(asset.ticker);
    const nativePrice = quote?.price ?? asset.basePrice;
    const price = convertToEuro(nativePrice, quote?.currency ?? asset.currency);
    const marginRate = asset.marginRateOverride ?? globalMargin;
    return {
      ticker: asset.ticker,
      name: asset.name,
      indexName: asset.indexName,
      country: asset.country,
      currency: EURO_CURRENCY,
      initials: asset.initials,
      totemImage: asset.totemImage,
      totemEmoji: asset.totemEmoji,
      totemName: asset.totemName,
      price: roundCurrency(price, EURO_CURRENCY),
      finalPrice: roundCurrency(calculateSellingPrice(price, marginRate), EURO_CURRENCY),
      marginRate,
      changePercent24h: quote?.changePercent24h ?? 0,
    };
  });
}

/**
 * Catalogue mis en cache 60 s (cache de données Next, partagé entre requêtes et
 * instances serverless) : évite de refaire les requêtes DB + l'appel marché à
 * chaque navigation. Une modification admin (marge, activation d'un actif) peut
 * mettre jusqu'à 60 s à se refléter sur les pages publiques.
 */
export const getCatalog = unstable_cache(computeCatalog, ["catalog"], {
  revalidate: 60,
  tags: ["catalog"],
});

export async function getAssetDetail(ticker: string) {
  const asset = await prisma.asset.findUnique({ where: { ticker } });
  if (!asset || !asset.active) return null;
  const marginRate = await getEffectiveMarginRate(asset.marginRateOverride);
  const quote = await getMarketDataProvider().getQuote(ticker);
  const unitPrice = roundCurrency(convertToEuro(quote.price, quote.currency), EURO_CURRENCY);
  const unitFinalPrice = roundCurrency(
    calculateSellingPrice(unitPrice, marginRate),
    EURO_CURRENCY,
  );
  return {
    asset,
    quote,
    marginRate,
    unitPrice,
    unitFinalPrice,
    displayCurrency: EURO_CURRENCY,
  };
}
