/**
 * Fournisseur de données de marché Yahoo Finance (cours différés ~15 min).
 *
 * ⚠ Endpoint public NON OFFICIEL (celui qu'utilisent les librairies type
 * yfinance) : aucune garantie de disponibilité ni licence de redistribution.
 * Convient à un prototype de démonstration ; à remplacer par un fournisseur
 * sous licence avant toute utilisation commerciale (voir checklist README).
 *
 * Robustesse :
 *  - cache mémoire 60 s par ticker (évite d'appeler Yahoo à chaque rendu) ;
 *  - timeout 6 s par requête ;
 *  - repli automatique et silencieux sur la simulation locale
 *    (MockMarketDataProvider) pour tout ticker en échec.
 *
 * Les tickers du catalogue sont déjà au format Yahoo (AAPL, MC.PA, 7203.T…).
 */
import type { MarketDataProvider, MarketQuote } from "@/lib/providers/types";

interface YahooChartMeta {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  currency?: string;
  regularMarketTime?: number;
}

interface YahooChartResponse {
  chart?: {
    result?: { meta?: YahooChartMeta }[];
    error?: { description?: string } | null;
  };
}

interface CacheEntry {
  quote: MarketQuote;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 6_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export class YahooMarketDataProvider implements MarketDataProvider {
  readonly name = "yahoo-finance";
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly fallback: MarketDataProvider) {}

  async getQuote(ticker: string): Promise<MarketQuote> {
    const quotes = await this.getQuotes([ticker]);
    const quote = quotes.get(ticker);
    if (!quote) {
      throw new Error(`Cotation indisponible pour ${ticker}`);
    }
    return quote;
  }

  async getQuotes(tickers: string[]): Promise<Map<string, MarketQuote>> {
    const map = new Map<string, MarketQuote>();
    const now = Date.now();
    const misses: string[] = [];

    for (const ticker of tickers) {
      const cached = this.cache.get(ticker);
      if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        map.set(ticker, cached.quote);
      } else {
        misses.push(ticker);
      }
    }

    if (misses.length > 0) {
      const results = await Promise.allSettled(misses.map((t) => this.fetchQuote(t)));
      const failed: string[] = [];
      results.forEach((result, i) => {
        const ticker = misses[i] as string;
        if (result.status === "fulfilled") {
          this.cache.set(ticker, { quote: result.value, fetchedAt: now });
          map.set(ticker, result.value);
        } else {
          failed.push(ticker);
        }
      });

      // Repli sur la simulation locale pour les tickers en échec — l'app
      // reste pleinement fonctionnelle sans réseau.
      if (failed.length > 0) {
        console.warn(
          `[market-data] Yahoo indisponible pour ${failed.join(", ")} — repli sur la simulation.`,
        );
        const fallbackQuotes = await this.fallback.getQuotes(failed);
        for (const [ticker, quote] of fallbackQuotes) {
          map.set(ticker, { ...quote, source: "mock (repli Yahoo)" });
        }
      }
    }

    return map;
  }

  private async fetchQuote(ticker: string): Promise<MarketQuote> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Yahoo Finance HTTP ${response.status} pour ${ticker}`);
    }
    const json = (await response.json()) as YahooChartResponse;
    const meta = json.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
      throw new Error(
        json.chart?.error?.description ?? `Réponse Yahoo invalide pour ${ticker}`,
      );
    }
    const previousClose = meta?.chartPreviousClose ?? meta?.previousClose;
    return {
      ticker,
      price,
      currency: (meta?.currency ?? "USD").toUpperCase(),
      asOf: meta?.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(),
      source: this.name,
      changePercent24h:
        typeof previousClose === "number" && previousClose > 0 ? price / previousClose - 1 : 0,
    };
  }
}
