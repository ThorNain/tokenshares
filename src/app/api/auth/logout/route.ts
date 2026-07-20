/** Déconnexion : suppression du cookie de session. */
import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  destroySession();
  return NextResponse.json({ ok: true });
}
