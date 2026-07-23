/**
 * POST /api/redeem — réclamation d'un cadeau par son destinataire connecté.
 * Émet le token dans le wallet du destinataire et lui réattribue la commande.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { redeemGift } from "@/lib/fulfillment";
import { rateLimit } from "@/lib/rate-limit";
import { logError, safeErrorMessage } from "@/lib/error-log";

const bodySchema = z.object({ code: z.string().min(6).max(200) });

export async function POST(request: Request) {
  const limited = rateLimit(request, "redeem", 15, 60_000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise pour réclamer un cadeau." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Code invalide." }, { status: 400 });
  }

  try {
    const result = await redeemGift({
      code: parsed.data.code.trim(),
      redeemerUserId: session.userId,
      actor: { type: "user", id: session.userId, email: session.email },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Réclamation impossible." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, orderId: result.orderId });
  } catch (error) {
    await logError({
      service: "app",
      type: "redeem_error",
      message: "Erreur lors de la réclamation d'un cadeau.",
      technicalMessage: safeErrorMessage(error),
      userId: session.userId,
    });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
