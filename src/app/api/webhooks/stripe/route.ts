/**
 * Webhook Stripe — SEULE source de vérité pour la confirmation de paiement.
 * La signature est systématiquement vérifiée (STRIPE_WEBHOOK_SECRET) ; le
 * traitement est idempotent (event.id enregistré en base avec contrainte
 * d'unicité). Un retour navigateur ne valide jamais une commande.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { getStripeClient } from "@/lib/providers/payment/stripe";
import {
  markPaymentSucceeded,
  markPaymentFailed,
  handleWebhookProcessingError,
} from "@/lib/fulfillment";
import { fromMinorUnits } from "@/lib/pricing";
import { logError, safeErrorMessage } from "@/lib/error-log";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!env.stripeEnabled || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe n'est pas configuré." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (error) {
    await logError({
      service: "stripe",
      type: "webhook_signature_invalid",
      severity: "critical",
      message: "Webhook Stripe rejeté : signature invalide.",
      technicalMessage: safeErrorMessage(error),
    });
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  let orderId: string | undefined;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        orderId = session.metadata?.orderId;
        if (orderId && session.payment_status === "paid") {
          await markPaymentSucceeded({
            orderId,
            provider: "stripe",
            externalEventId: event.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
            amountReceived:
              session.amount_total != null
                ? fromMinorUnits(session.amount_total, session.currency ?? "eur")
                : null,
            method: "Carte / wallet (Stripe test)",
            webhookVerified: true,
          });
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        orderId = session.metadata?.orderId;
        if (orderId) {
          await markPaymentFailed({
            orderId,
            provider: "stripe",
            externalEventId: event.id,
            reason: "Session de paiement expirée.",
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: intent.id },
        });
        if (payment) {
          orderId = payment.orderId;
          await markPaymentFailed({
            orderId: payment.orderId,
            provider: "stripe",
            externalEventId: event.id,
            reason: intent.last_payment_error?.message ?? "Paiement refusé.",
          });
        }
        break;
      }
      default:
        // Événement non géré : accusé de réception sans traitement.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await handleWebhookProcessingError(orderId, error);
    // 500 → Stripe réessaiera automatiquement (stratégie de reprise).
    return NextResponse.json({ error: "Erreur de traitement." }, { status: 500 });
  }
}
