/**
 * PATCH /api/admin/assets/[assetId] — active/désactive un actif, ajuste sa
 * marge spécifique ou son prix de base. Journalisé.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  active: z.boolean().optional(),
  marginRateOverride: z.number().min(0).max(1).nullable().optional(),
  basePrice: z.number().positive().max(10_000_000).optional(),
});

export async function PATCH(request: Request, { params }: { params: { assetId: string } }) {
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

  const asset = await prisma.asset.findUnique({ where: { id: params.assetId } });
  if (!asset) {
    return NextResponse.json({ error: "Actif introuvable." }, { status: 404 });
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: parsed.data,
  });

  await audit({
    actor: { type: "admin", id: session.userId, email: session.email },
    action: "asset_updated",
    entityType: "Asset",
    entityId: asset.id,
    oldValue: JSON.stringify({
      active: asset.active,
      marginRateOverride: asset.marginRateOverride,
      basePrice: asset.basePrice,
    }),
    newValue: JSON.stringify({
      active: updated.active,
      marginRateOverride: updated.marginRateOverride,
      basePrice: updated.basePrice,
    }),
  });

  return NextResponse.json({ ok: true });
}
