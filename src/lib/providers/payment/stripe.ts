/**
 * Fournisseur de paiement Stripe — MODE TEST UNIQUEMENT pour ce prototype.
 * Utilise Stripe Checkout (page hébergée : carte, Apple Pay, Google Pay
 * selon la configuration du compte). La confirmation de commande ne se fait
 * JAMAIS ici : uniquement via le webhook signé (/api/webhooks/stripe).
 */
import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { toMinorUnits } from "@/lib/pricing";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutSessionResult,
  RefundParams,
  RefundResult,
} from "@/lib/providers/types";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  const key = env.stripeSecretKey;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante : le fournisseur Stripe n'est pas configuré.");
  }
  if (key.startsWith("sk_live_")) {
    // Garde-fou prototype : refuse toute clé de production.
    throw new Error(
      "Clé Stripe LIVE détectée. Ce prototype de démonstration n'accepte que des clés de test (sk_test_...).",
    );
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: toMinorUnits(params.amount, params.currency),
            product_data: {
              name: params.description,
              description:
                "Prototype de démonstration — aucun investissement réel. Le montant inclut une marge commerciale.",
            },
          },
        },
      ],
      metadata: {
        orderId: params.orderId,
        orderPublicId: params.orderPublicId,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    if (!session.url) {
      throw new Error("Stripe n'a pas retourné d'URL de paiement.");
    }
    return { provider: this.name, sessionId: session.id, url: session.url };
  }

  async reuseCheckoutSession(sessionId: string): Promise<CheckoutSessionResult | null> {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Réutilisable uniquement si la session est encore ouverte (ni payée, ni
      // expirée) et possède une URL. Sinon on laisse l'appelant en créer une
      // nouvelle — évite d'orphaner des sessions et le double encaissement.
      if (session.status === "open" && session.url) {
        return { provider: this.name, sessionId: session.id, url: session.url };
      }
      return null;
    } catch {
      return null;
    }
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    try {
      const stripe = getStripeClient();
      if (!params.stripePaymentIntentId) {
        return { ok: false, error: "PaymentIntent introuvable pour ce paiement." };
      }
      const refund = await stripe.refunds.create({
        payment_intent: params.stripePaymentIntentId,
      });
      return { ok: true, refundId: refund.id };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erreur Stripe inconnue" };
    }
  }
}
