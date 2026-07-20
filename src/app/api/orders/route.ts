/**
 * POST /api/orders — crée une commande (statut `created`) au prix du marché
 * figé pour l'utilisateur connecté.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { createOrder, OrderError } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { logError, safeErrorMessage } from "@/lib/error-log";

const bodySchema = z.object({
  ticker: z.string().min(1).max(20),
  quantity: z.number().int().min(1).max(100),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "create-order", 30, 60_000);
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
    const order = await createOrder({
      userId: session.userId,
      ticker: parsed.data.ticker,
      quantity: parsed.data.quantity,
      actor: { type: "user", id: session.userId, email: session.email },
    });
    return NextResponse.json({ ok: true, orderId: order.id, publicId: order.publicId });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    await logError({
      service: "app",
      type: "order_creation_error",
      message: "Erreur inattendue à la création d'une commande.",
      technicalMessage: safeErrorMessage(error),
      userId: session.userId,
    });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
