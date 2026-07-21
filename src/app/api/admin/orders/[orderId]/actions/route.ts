/**
 * POST /api/admin/orders/[orderId]/actions — actions manuelles de
 * l'administrateur (sections 25 & 28). Chaque action est confirmée côté UI,
 * journalisée (acteur, date, ancien/nouveau statut, justification) et les
 * actions de pure simulation sont réservées au mode démonstration
 * (DEMO_MODE=true, verrouillé en production).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdminSession } from "@/lib/session";
import { audit, type Actor } from "@/lib/audit";
import {
  runHedging,
  runMint,
  prepareShipping,
  regenerateQr,
  markShipped,
  markDelivered,
  refundOrder,
  cancelPendingOperation,
  markPaymentSucceeded,
  confirmHedgePrice,
  FulfillmentError,
} from "@/lib/fulfillment";
import { logError, safeErrorMessage } from "@/lib/error-log";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry_hedging"), justification: z.string().max(500).optional() }),
  z.object({
    action: z.literal("confirm_hedge_price"),
    executedPrice: z.number().positive().max(10_000_000),
    justification: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("retry_mint"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("start_mint"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("simulate_payment"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("simulate_chain_error"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("confirm_transfer"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("generate_qr"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("regenerate_qr"), justification: z.string().min(3, "Justification requise").max(500) }),
  z.object({
    action: z.literal("mark_shipped"),
    carrier: z.string().max(100).optional(),
    trackingNumber: z.string().max(100).optional(),
    justification: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("mark_delivered"), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("refund"), justification: z.string().min(3, "Justification requise").max(500) }),
  z.object({
    action: z.literal("cancel_operation"),
    target: z.enum(["hedging", "mint"]),
    justification: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("toggle_review"), value: z.boolean(), justification: z.string().max(500).optional() }),
  z.object({ action: z.literal("add_note"), note: z.string().min(1).max(2000) }),
  z.object({
    action: z.literal("add_tracking"),
    carrier: z.string().min(1).max(100),
    trackingNumber: z.string().min(1).max(100),
  }),
]);

const DEMO_ONLY_ACTIONS = new Set(["simulate_payment", "simulate_chain_error", "confirm_transfer"]);

export async function POST(request: Request, { params }: { params: { orderId: string } }) {
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

  if (DEMO_ONLY_ACTIONS.has(input.action) && !env.demoMode) {
    return NextResponse.json(
      { error: "Action de simulation disponible uniquement en mode démonstration (DEMO_MODE=true)." },
      { status: 403 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { payment: true, tokenMint: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  try {
    switch (input.action) {
      case "retry_hedging": {
        const result = await runHedging(order.id, actor);
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? "Échec de la couverture." }, { status: 502 });
        }
        break;
      }

      case "confirm_hedge_price": {
        const result = await confirmHedgePrice({
          orderId: order.id,
          executedPrice: input.executedPrice,
          actor,
        });
        if (!result.ok) {
          return NextResponse.json(
            { error: result.error ?? "Échec après confirmation du prix." },
            { status: 502 },
          );
        }
        break;
      }

      case "retry_mint":
      case "start_mint": {
        const result = await runMint(order.id, actor);
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? "Échec de l'émission." }, { status: 502 });
        }
        await prepareShipping(order.id, actor);
        break;
      }

      case "simulate_payment": {
        if (!order.payment) {
          await prisma.payment.create({
            data: {
              orderId: order.id,
              provider: "mock",
              status: "pending",
              amount: order.totalAmount,
              currency: order.currency,
            },
          });
        }
        await markPaymentSucceeded({
          orderId: order.id,
          provider: "mock",
          externalEventId: `demo_payment_${order.id}`,
          method: "Simulation administrateur",
          webhookVerified: true,
          actor,
        });
        break;
      }

      case "simulate_chain_error": {
        const result = await runMint(order.id, actor, { simulateFailure: true });
        // L'échec est le résultat attendu de cette action de test.
        return NextResponse.json({
          ok: true,
          message: result.ok
            ? "Le mint a réussi (l'échec simulé n'a pas pu être appliqué)."
            : `Erreur blockchain simulée enregistrée : ${result.error}`,
        });
      }

      case "confirm_transfer": {
        const mint = order.tokenMint;
        if (!mint || mint.status === "transfer_confirmed") {
          return NextResponse.json(
            { error: "Aucun transfert en attente pour cette commande." },
            { status: 409 },
          );
        }
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          await tx.tokenMint.update({
            where: { id: mint.id },
            data: { status: "transfer_confirmed", confirmations: 12, confirmedAt: now },
          });
          await tx.blockchainTransaction.updateMany({
            where: { tokenMintId: mint.id, status: { in: ["pending", "submitted"] } },
            data: { status: "confirmed", confirmations: 12, confirmedAt: now },
          });
          await tx.order.update({ where: { id: order.id }, data: { status: "minted" } });
        });
        await audit({
          actor,
          action: "transfer_confirmed_manually",
          entityType: "TokenMint",
          entityId: mint.id,
          orderId: order.id,
          oldValue: mint.status,
          newValue: "transfer_confirmed",
          justification: input.justification ?? null,
        });
        await prepareShipping(order.id, actor);
        break;
      }

      case "generate_qr": {
        await prepareShipping(order.id, actor);
        break;
      }

      case "regenerate_qr": {
        await regenerateQr(order.id, actor, input.justification);
        break;
      }

      case "mark_shipped": {
        await markShipped({
          orderId: order.id,
          actor,
          carrier: input.carrier,
          trackingNumber: input.trackingNumber,
          justification: input.justification,
        });
        break;
      }

      case "mark_delivered": {
        await markDelivered({ orderId: order.id, actor, justification: input.justification });
        break;
      }

      case "refund": {
        const result = await refundOrder({
          orderId: order.id,
          actor,
          justification: input.justification,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error ?? "Remboursement échoué." }, { status: 502 });
        }
        break;
      }

      case "cancel_operation": {
        await cancelPendingOperation({
          orderId: order.id,
          target: input.target,
          actor,
          justification: input.justification,
        });
        break;
      }

      case "toggle_review": {
        await prisma.order.update({
          where: { id: order.id },
          data: { needsReview: input.value },
        });
        await audit({
          actor,
          action: "order_review_flag_changed",
          entityType: "Order",
          entityId: order.id,
          orderId: order.id,
          oldValue: String(order.needsReview),
          newValue: String(input.value),
          justification: input.justification ?? null,
        });
        break;
      }

      case "add_note": {
        await prisma.order.update({
          where: { id: order.id },
          data: { internalNote: input.note },
        });
        await audit({
          actor,
          action: "internal_note_added",
          entityType: "Order",
          entityId: order.id,
          orderId: order.id,
          oldValue: order.internalNote,
          newValue: input.note,
        });
        break;
      }

      case "add_tracking": {
        await prisma.physicalItem.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            status: "ready",
            carrier: input.carrier,
            trackingNumber: input.trackingNumber,
          },
          update: { carrier: input.carrier, trackingNumber: input.trackingNumber },
        });
        await audit({
          actor,
          action: "tracking_number_added",
          entityType: "PhysicalItem",
          entityId: order.id,
          orderId: order.id,
          newValue: `${input.carrier} / ${input.trackingNumber}`,
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
      type: "admin_action_error",
      message: `Erreur lors de l'action admin « ${input.action} ».`,
      technicalMessage: safeErrorMessage(error),
      orderId: order.id,
    });
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
