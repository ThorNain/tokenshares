/**
 * POST /api/admin/assets — ajoute un actif au catalogue.
 * Le tokenId ERC-1155 est attribué automatiquement (max + 1).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { audit } from "@/lib/audit";
import { MARKET_INDEXES } from "@/lib/status";

const bodySchema = z.object({
  ticker: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  indexName: z.enum(MARKET_INDEXES),
  country: z.string().trim().min(2).max(60),
  currency: z.enum(["EUR", "USD", "JPY"]),
  basePrice: z.number().positive().max(10_000_000),
  initials: z.string().trim().min(1).max(4).optional(),
  totemEmoji: z.string().trim().min(1).max(8).optional(),
  totemName: z.string().trim().min(1).max(120).optional(),
  totemImage: z.string().trim().regex(/^\/totems\/[a-zA-Z0-9._/-]+$/).optional(),
});

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  const existing = await prisma.asset.findUnique({ where: { ticker: parsed.data.ticker } });
  if (existing) {
    return NextResponse.json({ error: "Ce ticker existe déjà." }, { status: 409 });
  }

  const maxToken = await prisma.asset.aggregate({ _max: { tokenId: true } });
  const asset = await prisma.asset.create({
    data: {
      ...parsed.data,
      initials: parsed.data.initials ?? parsed.data.name.slice(0, 2).toUpperCase(),
      tokenId: (maxToken._max.tokenId ?? 0) + 1,
      active: true,
    },
  });

  await audit({
    actor: { type: "admin", id: session.userId, email: session.email },
    action: "asset_created",
    entityType: "Asset",
    entityId: asset.id,
    newValue: JSON.stringify({ ticker: asset.ticker, tokenId: asset.tokenId }),
  });

  return NextResponse.json({ ok: true, assetId: asset.id });
}
