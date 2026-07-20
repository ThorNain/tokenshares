/**
 * Fournisseur de paiement SIMULÉ, utilisé quand aucune clé Stripe n'est
 * configurée. Redirige vers une page de paiement fictive (/mock-checkout/…)
 * qui permet de simuler un succès ou un échec — le résultat passe par le
 * même pipeline que le webhook Stripe.
 */
import { randomBytes } from "node:crypto";
import { simulatedRef } from "@/lib/public-token";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutSessionResult,
  RefundParams,
  RefundResult,
} from "@/lib/providers/types";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${randomBytes(10).toString("hex")}`;
    void params;
    return {
      provider: this.name,
      sessionId,
      url: `/mock-checkout/${sessionId}`,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    void params;
    return { ok: true, refundId: simulatedRef("mock_re") };
  }
}
