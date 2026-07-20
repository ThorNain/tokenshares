/**
 * « Webhook » du fournisseur de paiement SIMULÉ : appelé par la page
 * /mock-checkout/[sessionId] pour simuler la confirmation ou l'échec d'un
 * paiement. N'accepte que les paiements du provider "mock" — inopérant dès
 * que Stripe est configuré. Passe par le même pipeline idempotent que le
 * webhook Stripe.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { markPaymentSucceeded, markPaymentFailed } from "@/lib/fulfillment";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  sessionId: z.string().startsWith("mock_cs_").max(100),
  outcome: z.enum(["success", "failure"]),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "mock-webhook", 30, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: parsed.data.sessionId },
    include: { order: true },
  });
  if (!payment || payment.provider !== "mock") {
    return NextResponse.json({ error: "Session de paiement introuvable." }, { status: 404 });
  }

  if (parsed.data.outcome === "success") {
    await markPaymentSucceeded({
      orderId: payment.orderId,
      provider: "mock",
      externalEventId: `mock_evt_${parsed.data.sessionId}`,
      method: "Carte bancaire (simulée)",
      webhookVerified: true,
    });
  } else {
    await markPaymentFailed({
      orderId: payment.orderId,
      provider: "mock",
      externalEventId: `mock_evt_fail_${parsed.data.sessionId}_${Date.now()}`,
      reason: "Paiement refusé (échec simulé par l'utilisateur).",
    });
  }

  return NextResponse.json({
    ok: true,
    redirect: `/checkout/${payment.orderId}/confirmation`,
  });
}
