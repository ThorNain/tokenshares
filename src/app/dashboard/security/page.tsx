/**
 * Vue sécurité : état de connexion, méthodes, export du wallet via Privy,
 * déconnexion et avertissements (section 8).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ExportWalletButton } from "@/components/export-wallet-button";
import { LogoutButton } from "@/components/logout-button";
import { Alert, Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { wallets: true },
  });
  if (!user) redirect("/login");

  const method = user.privyUserId ? "Privy (e-mail / passkey)" : "Connexion de démonstration (e-mail)";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-ink">État de connexion</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Statut</dt>
            <dd>
              <Badge tone="success">● Connecté</Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">E-mail</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Méthode de connexion</dt>
            <dd className="text-ink">{method}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Compte créé le</dt>
            <dd className="text-ink">{formatDateTime(user.createdAt)}</dd>
          </div>
          {user.privyUserId ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Identifiant Privy</dt>
              <dd className="font-mono text-xs text-ink">{user.privyUserId}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-ink">Wallet</h3>
        {user.wallets.map((w) => (
          <p key={w.id} className="mt-2 break-all font-mono text-sm text-ink-soft">
            {w.address}{" "}
            <Badge tone={w.provider === "privy" ? "info" : "neutral"} className="ml-1 align-middle">
              {w.provider === "privy" ? "Privy" : "démo"}
            </Badge>
          </p>
        ))}
        <div className="mt-5">
          <ExportWalletButton />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-ink">Avertissements de sécurité</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>Nous ne vous demanderons jamais votre clé privée ni votre phrase de récupération.</li>
          <li>Aucune clé n&apos;est envoyée par e-mail ni stockée sur nos serveurs.</li>
          <li>Le QR code de votre objet est un simple lien : il ne donne jamais accès au wallet.</li>
          <li>En cas de doute sur un lien, régénérez le QR code depuis le support.</li>
        </ul>
        <div className="mt-5 border-t border-ink/10 pt-4">
          <LogoutButton />
        </div>
      </Card>

      <Alert tone="warning">
        Environnement de démonstration : les wallets, paiements et tokens sont fictifs ou de test.
      </Alert>
    </div>
  );
}
