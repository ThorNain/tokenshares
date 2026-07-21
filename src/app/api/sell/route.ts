/**
 * POST /api/sell — le détenteur demande la revente de tokens d'un actif.
 * Vérifie la détention réelle, crée l'ordre de vente et le transmet au courtier
 * (exécution immédiate en simulation, différée en mode manuel).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { requestSell, FulfillmentError } from "@/lib/fulfillment";
import { rateLimit } from "@/lib/rate-limit";
import { logError, safeErrorMessage } from "@/lib/error-log";

const bodySchema = z.object({
  assetId: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(100),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "sell", 20, 60_000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  try {
    const result = await requestSell({
      userId: session.userId,
      assetId: parsed.data.assetId,
      quantity: parsed.data.quantity,
      actor: { type: "user", id: session.userId, email: session.email },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Vente impossible." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sellOrderId: result.sellOrderId, pending: result.pending });
  } catch (error) {
    if (error instanceof FulfillmentError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    await logError({
      service: "app",
      type: "sell_request_error",
      message: "Erreur lors d'une demande de vente.",
      technicalMessage: safeErrorMessage(error),
      userId: session.userId,
    });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
