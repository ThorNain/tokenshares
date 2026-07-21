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
}).strict();

class PrivyAccountConflict extends Error {
  constructor(
    readonly type: "email_owner_conflict" | "wallet_owner_conflict",
    message: string,
  ) {
    super(message);
    this.name = "PrivyAccountConflict";
  }
}

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

  // La création du compte applicatif n'est finalisée que lorsque Privy a bien
  // provisionné un wallet EVM. L'adresse vient exclusivement de l'API Privy,
  // jamais d'une valeur déclarée par le navigateur.
  if (!verified.walletAddress) {
    await logError({
      service: "privy",
      type: "embedded_wallet_missing",
      severity: "warning",
      message: "Compte Privy authentifié sans wallet EVM embarqué.",
    });
    return NextResponse.json(
      { error: "Votre wallet Privy n'est pas encore disponible. Veuillez réessayer." },
      { status: 409 },
    );
  }
  const walletAddress = verified.walletAddress;

  let provisioned;
  try {
    provisioned = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { privyUserId: verified.privyUserId },
      });

      if (!user) {
        const emailOwner = await tx.user.findUnique({ where: { email } });
        if (emailOwner) {
          // Permet de migrer sans doublon un ancien compte de démonstration,
          // uniquement lorsqu'il s'agit bien d'un compte client non lié.
          if (emailOwner.role !== "customer" || emailOwner.privyUserId) {
            throw new PrivyAccountConflict(
              "email_owner_conflict",
              "L'adresse e-mail Privy est déjà rattachée à un autre compte.",
            );
          }
          user = await tx.user.update({
            where: { id: emailOwner.id },
            data: { privyUserId: verified.privyUserId },
          });
        } else {
          user = await tx.user.create({
            data: { privyUserId: verified.privyUserId, email, role: "customer" },
          });
        }
      } else if (user.email !== email) {
        const emailOwner = await tx.user.findUnique({ where: { email } });
        if (emailOwner && emailOwner.id !== user.id) {
          throw new PrivyAccountConflict(
            "email_owner_conflict",
            "La nouvelle adresse e-mail Privy appartient déjà à un autre compte.",
          );
        }
        user = await tx.user.update({ where: { id: user.id }, data: { email } });
      }

      const existingWallet = await tx.wallet.findUnique({
        where: {
          address_chainId: { address: walletAddress, chainId: env.chainId },
        },
      });
      if (existingWallet && existingWallet.userId !== user.id) {
        throw new PrivyAccountConflict(
          "wallet_owner_conflict",
          "Le wallet Privy vérifié est déjà rattaché à un autre utilisateur.",
        );
      }

      const wallet = existingWallet
        ? await tx.wallet.update({
            where: { id: existingWallet.id },
            data: { provider: "privy" },
          })
        : await tx.wallet.create({
            data: {
              userId: user.id,
              address: walletAddress,
              chainId: env.chainId,
              provider: "privy",
            },
          });

      return { user, wallet };
    });
  } catch (error) {
    if (!(error instanceof PrivyAccountConflict)) throw error;
    await logError({
      service: "privy",
      type: error.type,
      severity: "critical",
      message: error.message,
    });
    return NextResponse.json(
      { error: "Ces identifiants Privy sont déjà associés à un autre compte." },
      { status: 409 },
    );
  }

  const { user, wallet } = provisioned;

  await createSession({ userId: user.id, role: "customer", email: user.email });
  await audit({
    actor: { type: "user", id: user.id, email: user.email },
    action: "user_login_privy",
    entityType: "User",
    entityId: user.id,
  });

  return NextResponse.json({ ok: true, walletAddress: wallet.address });
}
