/**
 * GET /api/cron/chain-sync — synchronisation on-chain périodique (Vercel Cron,
 * voir vercel.json). Protégé : n'accepte que les appels du Cron Vercel
 * (en-tête Authorization: Bearer $CRON_SECRET) quand CRON_SECRET est défini.
 * Si CRON_SECRET n'est pas configuré, l'endpoint est inactif (renvoie 404)
 * pour ne pas exposer un déclencheur public.
 */
import { NextResponse } from "next/server";
import { syncChainTransfers } from "@/lib/chain-sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Pas de secret configuré → endpoint désactivé (jamais public).
    return NextResponse.json({ error: "Cron non configuré." }, { status: 404 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const result = await syncChainTransfers();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
