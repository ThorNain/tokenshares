/**
 * Fournisseur de données de marché SIMULÉ.
 * Génère des prix déterministes (marche pseudo-aléatoire à base de sinusoïdes
 * dont la phase dépend du ticker) autour du prix de base configuré pour
 * chaque actif. Déterministe par tranche de 5 minutes → cohérent entre SSR,
 * client et rechargements.
 *
 * À remplacer plus tard par un fournisseur réel (ex. API de cotation) en
 * implémentant MarketDataProvider.
 */
import { prisma } from "@/lib/db";
import type { MarketDataProvider, MarketQuote } from "@/lib/providers/types";

const BUCKET_MS = 5 * 60 * 1000;

/** Hash FNV-1a → valeur dans [0, 1). Déterministe, non cryptographique (affichage uniquement). */
function hashToUnit(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Facteur multiplicatif simulé (±4 % environ) pour un ticker à un instant donné. */
function simulatedFactor(ticker: string, bucket: number): number {
  const phase = hashToUnit(ticker) * Math.PI * 2;
  const jitter = (hashToUnit(`${ticker}:${bucket}`) - 0.5) * 0.006;
  return (
    1 +
    Math.sin(bucket / 7 + phase) * 0.022 +
    Math.sin(bucket / 31 + phase * 3.7) * 0.015 +
    jitter
  );
}

export function simulatedPrice(ticker: string, basePrice: number, at: Date = new Date()): number {
  const bucket = Math.floor(at.getTime() / BUCKET_MS);
  return basePrice * simulatedFactor(ticker, bucket);
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly name = "mock";

  async getQuote(ticker: string): Promise<MarketQuote> {
    const asset = await prisma.asset.findUnique({ where: { ticker } });
    if (!asset) {
      throw new Error(`Actif inconnu : ${ticker}`);
    }
    return this.quoteFor(ticker, asset.basePrice, asset.currency);
  }

  async getQuotes(tickers: string[]): Promise<Map<string, MarketQuote>> {
    const assets = await prisma.asset.findMany({ where: { ticker: { in: tickers } } });
    const map = new Map<string, MarketQuote>();
    for (const asset of assets) {
      map.set(asset.ticker, this.quoteFor(asset.ticker, asset.basePrice, asset.currency));
    }
    return map;
  }

  private quoteFor(ticker: string, basePrice: number, currency: string): MarketQuote {
    const now = new Date();
    const bucket = Math.floor(now.getTime() / BUCKET_MS);
    const price = basePrice * simulatedFactor(ticker, bucket);
    // Variation « 24 h » : comparaison avec la tranche d'il y a 288 × 5 min.
    const previous = basePrice * simulatedFactor(ticker, bucket - 288);
    return {
      ticker,
      price,
      currency,
      asOf: now,
      source: this.name,
      changePercent24h: previous > 0 ? price / previous - 1 : 0,
    };
  }
}
