/**
 * POST /api/admin/chain-sync — déclenche manuellement la synchronisation
 * on-chain (indexation des transferts + réconciliation de la propriété).
 * Réservé aux administrateurs.
 */
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/session";
import { syncChainTransfers } from "@/lib/chain-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }
  const result = await syncChainTransfers({ type: "admin", id: session.userId, email: session.email });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
