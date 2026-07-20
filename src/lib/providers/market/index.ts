/**
 * Point d'accès au fournisseur de données de marché, sélectionné par la
 * variable d'environnement MARKET_DATA_PROVIDER :
 *  - "mock"  (défaut) : prix simulés déterministes, aucune dépendance réseau ;
 *  - "yahoo"          : Yahoo Finance (cours différés, endpoint non officiel)
 *                       avec repli automatique sur la simulation.
 * Pour un fournisseur sous licence : implémenter MarketDataProvider et
 * l'ajouter ici.
 */
import type { MarketDataProvider } from "@/lib/providers/types";
import { MockMarketDataProvider } from "@/lib/providers/market/mock";
import { YahooMarketDataProvider } from "@/lib/providers/market/yahoo";

let instance: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!instance) {
    const mock = new MockMarketDataProvider();
    instance =
      process.env.MARKET_DATA_PROVIDER === "yahoo" ? new YahooMarketDataProvider(mock) : mock;
  }
  return instance;
}
