/**
 * Échange d'un access token Privy (vérifié côté serveur via
 * @privy-io/server-auth) contre une session applicative. L'application ne
 * stocke que : identifiant Privy, email (si autorisé), adresse publique du
 * wallet, date de création. Jamais de clé privée ni de seed phrase.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createSession } from "@/lib/session";
import { verifyPrivyAccessToken } from "@/lib/privy";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/error-log";
import { audit } from "@/lib/audit";

const bodySchema = z.object({
  accessToken: z.string().min(10).max(5000),
  // Adresse communiquée par le client en secours ; l'adresse vérifiée côté
  // Privy est toujours prioritaire.
  walletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Adresse de wallet invalide")
    .optional(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, "privy-login", 20, 60_000);
  if (limited) return limited;

  if (!env.privyEnabled) {
    return NextResponse.json({ error: "Privy n'est pas configuré." }, { status: 400 });
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

  const verified = await verifyPrivyAccessToken(parsed.data.accessToken);
  if (!verified) {
    await logError({
      service: "privy",
      type: "token_verification_failed",
      severity: "warning",
      message: "Échec de vérification d'un access token Privy.",
    });
    return NextResponse.json({ error: "Authentification Privy invalide." }, { status: 401 });
  }

  const email = verified.email ?? `${verified.privyUserId.replace(/[^a-zA-Z0-9]/g, "")}@privy.local`;

  const user = await prisma.user.upsert({
    where: { privyUserId: verified.privyUserId },
    create: { privyUserId: verified.privyUserId, email, role: "customer" },
    update: { email },
  });

  const walletAddress = verified.walletAddress ?? parsed.data.walletAddress ?? null;
  if (walletAddress) {
    await prisma.wallet.upsert({
      where: { address_chainId: { address: walletAddress, chainId: env.chainId } },
      create: { userId: user.id, address: walletAddress, chainId: env.chainId, provider: "privy" },
      update: {},
    });
  }

  await createSession({ userId: user.id, role: "customer", email: user.email });
  await audit({
    actor: { type: "user", id: user.id, email: user.email },
    action: "user_login_privy",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({ ok: true });
}
