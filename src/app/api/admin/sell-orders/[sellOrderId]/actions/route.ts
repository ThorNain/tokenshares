/**
 * POST /api/admin/sell-orders/[sellOrderId]/actions — actions manuelles de
 * l'opérateur sur un ordre de vente : confirmer le prix réel obtenu chez le
 * courtier (déclenche la destruction du token), relancer une destruction
 * échouée, ou annuler.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { audit, type Actor } from "@/lib/audit";
import { confirmSellPrice, runBurn, FulfillmentError } from "@/lib/fulfillment";
import { logError, safeErrorMessage } from "@/lib/error-log";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm_sell_price"),
    executedPrice: z.number().positive().max(10_000_000),
    justification: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("retry_burn"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("cancel"), justification: z.string().max(500).optional() }),
]);

export async function POST(request: Request, { params }: { params: { sellOrderId: string } }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }
  const actor: Actor = { type: "admin", id: session.userId, email: session.email };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Action invalide." },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const sellOrder = await prisma.sellOrder.findUnique({ where: { id: params.sellOrderId } });
  if (!sellOrder) {
    return NextResponse.json({ error: "Ordre de vente introuvable." }, { status: 404 });
  }

  try {
    switch (input.action) {
      case "confirm_sell_price": {
        const result = await confirmSellPrice({
          sellOrderId: sellOrder.id,
          executedPrice: input.executedPrice,
          actor,
        });
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error ?? "Échec de la destruction après confirmation." },
            { status: 502 },
          );
        }
        break;
      }
      case "retry_burn": {
        const result = await runBurn(sellOrder.id, actor);
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? "Échec de la destruction." }, { status: 502 });
        }
        break;
      }
      case "cancel": {
        if (["completed", "burning"].includes(sellOrder.status)) {
          return NextResponse.json(
            { error: "Impossible d'annuler une vente déjà finalisée ou en cours de destruction." },
            { status: 409 },
          );
        }
        await prisma.sellOrder.update({
          where: { id: sellOrder.id },
          data: { status: "cancelled" },
        });
        await audit({
          actor,
          action: "sell_cancelled",
          entityType: "SellOrder",
          entityId: sellOrder.id,
          oldValue: sellOrder.status,
          newValue: "cancelled",
          justification: input.justification ?? null,
        });
        break;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof FulfillmentError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    await logError({
      service: "app",
      type: "admin_sell_action_error",
      message: `Erreur action vente « ${input.action} ».`,
      technicalMessage: safeErrorMessage(error),
    });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
