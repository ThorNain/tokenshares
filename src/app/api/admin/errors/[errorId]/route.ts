/**
 * PATCH /api/admin/errors/[errorId] — marque une erreur comme résolue / non
 * résolue.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { audit } from "@/lib/audit";

const bodySchema = z.object({ resolved: z.boolean() });

export async function PATCH(request: Request, { params }: { params: { errorId: string } }) {
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

  const errorLog = await prisma.errorLog.findUnique({ where: { id: params.errorId } });
  if (!errorLog) {
    return NextResponse.json({ error: "Erreur introuvable." }, { status: 404 });
  }

  await prisma.errorLog.update({
    where: { id: errorLog.id },
    data: {
      resolved: parsed.data.resolved,
      resolvedAt: parsed.data.resolved ? new Date() : null,
    },
  });

  await audit({
    actor: { type: "admin", id: session.userId, email: session.email },
    action: "error_resolution_changed",
    entityType: "ErrorLog",
    entityId: errorLog.id,
    orderId: errorLog.orderId ?? undefined,
    oldValue: String(errorLog.resolved),
    newValue: String(parsed.data.resolved),
  });

  return NextResponse.json({ ok: true });
}
