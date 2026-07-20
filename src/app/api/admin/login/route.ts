/**
 * Connexion administrateur. Les identifiants proviennent exclusivement des
 * variables d'environnement (ADMIN_EMAIL / ADMIN_PASSWORD) — jamais codés en
 * dur dans le frontend ni stockés en base. Comparaison en temps constant.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { logError } from "@/lib/error-log";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(500),
});

function safeEquals(a: string, b: string): boolean {
  // Hachage préalable → longueurs égales → comparaison en temps constant.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  const limited = rateLimit(request, "admin-login", 5, 60_000);
  if (limited) return limited;

  if (!env.adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD n'est pas configuré sur le serveur." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }

  const emailOk = safeEquals(parsed.data.email.toLowerCase(), env.adminEmail.toLowerCase());
  const passwordOk = safeEquals(parsed.data.password, env.adminPassword);
  if (!emailOk || !passwordOk) {
    await logError({
      service: "auth",
      type: "admin_login_failed",
      severity: "warning",
      message: "Tentative de connexion administrateur échouée.",
    });
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }

  // Compte admin en base (pour relier les journaux d'audit à un acteur).
  const admin = await prisma.user.upsert({
    where: { email: env.adminEmail.toLowerCase() },
    create: { email: env.adminEmail.toLowerCase(), role: "admin", firstName: "Admin", lastName: "Démo" },
    update: { role: "admin" },
  });

  await createSession({ userId: admin.id, role: "admin", email: admin.email });
  await audit({
    actor: { type: "admin", id: admin.id, email: admin.email },
    action: "admin_login",
    entityType: "User",
    entityId: admin.id,
  });

  return NextResponse.json({ ok: true });
}
