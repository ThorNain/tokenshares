/**
 * Connexion de DÉMONSTRATION (uniquement quand Privy n'est pas configuré) :
 * identifie l'utilisateur par email et lui associe un wallet fictif
 * déterministe. Aucun mot de passe n'est demandé ni stocké — ce mode est
 * clairement affiché comme fictif dans l'interface.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/session";
import { demoWalletAddress } from "@/lib/public-token";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  email: z.string().email("Adresse e-mail invalide").max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "demo-login", 20, 60_000);
  if (limited) return limited;

  if (env.privyEnabled) {
    return NextResponse.json(
      { error: "Privy est configuré : utilisez la connexion Privy." },
      { status: 400 },
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  // Le compte admin ne se connecte jamais par ce canal.
  if (email === env.adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "Utilisez la page /admin/login." }, { status: 403 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      firstName: parsed.data.firstName ?? null,
      lastName: parsed.data.lastName ?? null,
      role: "customer",
    },
    update: {
      firstName: parsed.data.firstName || undefined,
      lastName: parsed.data.lastName || undefined,
    },
  });

  // Wallet fictif de démonstration (adresse dérivée de l'email, aucune clé).
  const address = demoWalletAddress(email);
  await prisma.wallet.upsert({
    where: { address_chainId: { address, chainId: env.chainId } },
    create: { userId: user.id, address, chainId: env.chainId, provider: "demo" },
    update: {},
  });

  await createSession({ userId: user.id, role: "customer", email: user.email });
  await audit({
    actor: { type: "user", id: user.id, email: user.email },
    action: "user_login_demo",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({ ok: true });
}
