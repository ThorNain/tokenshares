/**
 * Courtier SIMULÉ. Aucune action réelle n'est achetée : l'opération
 * représente l'achat de couverture que l'entreprise effectuerait auprès d'un
 * courtier réglementé. Pour brancher un vrai courtier : implémenter
 * BrokerProvider (buyAsset) et le retourner dans broker/index.ts.
 */
import { simulatedRef } from "@/lib/public-token";
import type { BrokerProvider, BuyAssetParams, BrokerOrderResult } from "@/lib/providers/types";

export class MockBrokerProvider implements BrokerProvider {
  readonly name = "mock-broker";

  async buyAsset(params: BuyAssetParams): Promise<BrokerOrderResult> {
    if (!Number.isInteger(params.quantity) || params.quantity < 1) {
      return { ok: false, error: `Quantité invalide : ${params.quantity}` };
    }
    if (!Number.isFinite(params.referencePrice) || params.referencePrice <= 0) {
      return { ok: false, error: `Prix de référence invalide : ${params.referencePrice}` };
    }
    // Latence simulée d'exécution chez le courtier.
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      ok: true,
      brokerRef: simulatedRef("SIM"),
      executedAt: new Date(),
      executedPrice: params.referencePrice,
    };
  }
}
