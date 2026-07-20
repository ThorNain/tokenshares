/**
 * Journal d'audit des actions sensibles (changement d'adresse, de statut,
 * émission de token, remboursement, régénération de QR code, actions admin…).
 */
import { prisma } from "@/lib/db";
import type { Prisma, PrismaClient } from "@prisma/client";

export type Actor = {
  type: "user" | "admin" | "system";
  id?: string;
  email?: string;
};

export const SYSTEM_ACTOR: Actor = { type: "system" };

type Db = PrismaClient | Prisma.TransactionClient;

export async function audit(
  params: {
    actor: Actor;
    action: string;
    entityType: string;
    entityId: string;
    orderId?: string;
    oldValue?: string | null;
    newValue?: string | null;
    justification?: string | null;
  },
  db: Db = prisma,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorType: params.actor.type,
        actorId: params.actor.id ?? null,
        actorEmail: params.actor.email ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        orderId: params.orderId ?? null,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        justification: params.justification ?? null,
      },
    });
  } catch (error) {
    // L'audit ne doit jamais faire échouer l'opération principale, mais
    // l'échec est tracé (sans données sensibles).
    console.error("[audit] échec d'écriture du journal d'audit", {
      action: params.action,
      entityType: params.entityType,
    });
  }
}
