/**
 * Sélection du fournisseur de paiement :
 *  - Stripe (mode test) si STRIPE_SECRET_KEY est configurée ;
 *  - simulation locale sinon (aucune dépendance externe).
 */
import "server-only";
import { env } from "@/lib/env";
import type { PaymentProvider } from "@/lib/providers/types";
import { MockPaymentProvider } from "@/lib/providers/payment/mock";
import { StripePaymentProvider } from "@/lib/providers/payment/stripe";

let instance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!instance) {
    instance = env.stripeEnabled ? new StripePaymentProvider() : new MockPaymentProvider();
  }
  return instance;
}
