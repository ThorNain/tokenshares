/**
 * PUT /api/orders/[orderId]/gift — active/désactive l'option « cadeau » d'une
 * commande (avant paiement). Un cadeau diffère l'émission du token jusqu'à sa
 * réclamation par le destinataire via un code.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { setOrderGift, OrderError } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ isGift: z.boolean() });

export async function PUT(request: Request, { params }: { params: { orderId: string } }) {
  const limited = rateLimit(request, "gift", 30, 60_000);
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
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  try {
    await setOrderGift({
      orderId: params.orderId,
      userId: session.userId,
      isGift: parsed.data.isGift,
      actor: { type: "user", id: session.userId, email: session.email },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
