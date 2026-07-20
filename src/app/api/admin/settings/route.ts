/**
 * PUT /api/admin/settings — paramètres globaux : taux de marge (défaut 10 %)
 * et suspension temporaire des nouvelles commandes.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/session";
import { getMarginRate, setMarginRate, areOrdersPaused, setOrdersPaused } from "@/lib/settings";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  marginRate: z.number().min(0).max(1).optional(),
  ordersPaused: z.boolean().optional(),
  justification: z.string().max(500).optional(),
});

export async function PUT(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
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

  const actor = { type: "admin" as const, id: session.userId, email: session.email };

  if (parsed.data.marginRate !== undefined) {
    const old = await getMarginRate();
    await setMarginRate(parsed.data.marginRate);
    await audit({
      actor,
      action: "margin_rate_changed",
      entityType: "Setting",
      entityId: "margin_rate",
      oldValue: String(old),
      newValue: String(parsed.data.marginRate),
      justification: parsed.data.justification ?? null,
    });
  }

  if (parsed.data.ordersPaused !== undefined) {
    const old = await areOrdersPaused();
    await setOrdersPaused(parsed.data.ordersPaused);
    await audit({
      actor,
      action: "orders_pause_changed",
      entityType: "Setting",
      entityId: "orders_paused",
      oldValue: String(old),
      newValue: String(parsed.data.ordersPaused),
      justification: parsed.data.justification ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
