/**
 * POST /api/orders/[orderId]/pay — initie le paiement : passe la commande en
 * `pending_payment` et retourne l'URL de paiement (Stripe Checkout mode test
 * ou page simulée). La confirmation viendra exclusivement du webhook.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { initiatePayment, OrderError } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { logError, safeErrorMessage } from "@/lib/error-log";

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const limited = rateLimit(request, "pay", 15, 60_000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const checkout = await initiatePayment({
      orderId: params.orderId,
      userId: session.userId,
      userEmail: session.email,
      actor: { type: "user", id: session.userId, email: session.email },
    });
    return NextResponse.json({ ok: true, url: checkout.url });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    await logError({
      service: "stripe",
      type: "checkout_creation_error",
      message: "Erreur à l'initiation du paiement.",
      technicalMessage: safeErrorMessage(error),
      orderId: params.orderId,
      userId: session.userId,
    });
    return NextResponse.json({ error: "Le paiement est momentanément indisponible." }, { status: 502 });
  }
}
