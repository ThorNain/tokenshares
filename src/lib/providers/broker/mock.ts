/**
 * Courtier SIMULÉ. Aucune action réelle n'est achetée : l'opération
 * représente l'achat de couverture que l'entreprise effectuerait auprès d'un
 * courtier réglementé. Pour brancher un vrai courtier : implémenter
 * BrokerProvider (buyAsset) et le retourner dans broker/index.ts.
 */
import { simulatedRef } from "@/lib/public-token";
import type {
  BrokerProvider,
  BuyAssetParams,
  SellAssetParams,
  BrokerOrderResult,
} from "@/lib/providers/types";

export class MockBrokerProvider implements BrokerProvider {
  readonly name = "mock-broker";

  async buyAsset(params: BuyAssetParams): Promise<BrokerOrderResult> {
    return this.execute(params.quantity, params.referencePrice, "SIM-BUY");
  }

  async sellAsset(params: SellAssetParams): Promise<BrokerOrderResult> {
    return this.execute(params.quantity, params.referencePrice, "SIM-SELL");
  }

  private async execute(
    quantity: number,
    referencePrice: number,
    prefix: string,
  ): Promise<BrokerOrderResult> {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, error: `Quantité invalide : ${quantity}` };
    }
    if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
      return { ok: false, error: `Prix de référence invalide : ${referencePrice}` };
    }
    // Latence simulée d'exécution chez le courtier.
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      ok: true,
      brokerRef: simulatedRef(prefix),
      executedAt: new Date(),
      executedPrice: referencePrice,
    };
  }
}
