/**
 * PUT /api/orders/[orderId]/address — enregistre/modifie l'adresse de
 * livraison (validée par Zod côté serveur, en plus de la validation client).
 * Autorisé tant que la commande n'est pas expédiée.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { upsertShippingAddress, OrderError } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema } from "@/lib/validation";

export async function PUT(request: Request, { params }: { params: { orderId: string } }) {
  const limited = rateLimit(request, "address", 30, 60_000);
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
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Adresse invalide." },
      { status: 400 },
    );
  }

  try {
    await upsertShippingAddress({
      orderId: params.orderId,
      userId: session.userId,
      actor: { type: "user", id: session.userId, email: session.email },
      address: {
        ...parsed.data,
        line2: parsed.data.line2 || null,
        phone: parsed.data.phone || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
