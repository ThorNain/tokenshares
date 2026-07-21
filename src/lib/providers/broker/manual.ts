/**
 * Courtier MANUEL. L'ordre (achat de couverture ou vente) est enregistré mais
 * PAS exécuté automatiquement : l'opérateur passe réellement l'ordre sur sa
 * plateforme de courtage (ex. Degiro), puis saisit le prix obtenu dans
 * l'interface d'administration. Les deux méthodes retournent donc
 * `pending: true`.
 *
 * C'est le mode adapté à un test « pour soi » : aucune API de courtage n'est
 * appelée (Degiro n'en fournit pas officiellement), l'humain reste dans la
 * boucle et fournit le prix réel.
 */
import { simulatedRef } from "@/lib/public-token";
import type {
  BrokerProvider,
  BuyAssetParams,
  SellAssetParams,
  BrokerOrderResult,
} from "@/lib/providers/types";

export class ManualBrokerProvider implements BrokerProvider {
  readonly name = "manual";

  async buyAsset(params: BuyAssetParams): Promise<BrokerOrderResult> {
    return this.queue(params.quantity, params.referencePrice, "MAN-BUY");
  }

  async sellAsset(params: SellAssetParams): Promise<BrokerOrderResult> {
    return this.queue(params.quantity, params.referencePrice, "MAN-SELL");
  }

  private queue(quantity: number, referencePrice: number, prefix: string): BrokerOrderResult {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: `Quantité invalide : ${quantity}` };
    }
    if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
      return { ok: false, error: `Prix de référence invalide : ${referencePrice}` };
    }
    // Enregistré, en attente d'exécution manuelle par l'opérateur.
    return { ok: true, pending: true, brokerRef: simulatedRef(prefix) };
  }
}
