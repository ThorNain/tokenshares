/** Paramètres administrateur : marge globale, pause des commandes, environnement. */
import { getMarginRate, areOrdersPaused } from "@/lib/settings";
import { env } from "@/lib/env";
import { getBlockchainProvider } from "@/lib/providers/blockchain";
import { getPaymentProvider } from "@/lib/providers/payment";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [marginRate, ordersPaused] = await Promise.all([getMarginRate(), areOrdersPaused()]);
  const chain = getBlockchainProvider();
  const payment = getPaymentProvider();

  const envRows = [
    { label: "Mode démonstration (DEMO_MODE)", value: env.demoMode ? "activé" : "désactivé", tone: env.demoMode ? "warning" : "success" },
    { label: "Fournisseur de paiement", value: payment.name === "stripe" ? "Stripe (mode test)" : "Simulation locale", tone: "info" },
    { label: "Fournisseur blockchain", value: chain.name === "viem" ? chain.network : "Simulation locale", tone: "info" },
    { label: "Authentification", value: env.privyEnabled ? "Privy" : "Mode démonstration (e-mail)", tone: "info" },
    { label: "Contrat ERC-1155", value: chain.contractAddress, tone: "neutral" },
  ] as const;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-ink">Paramètres</h2>

      <SettingsForm marginRate={marginRate} ordersPaused={ordersPaused} />

      <Card className="p-6">
        <h3 className="font-semibold text-ink">Environnement</h3>
        <p className="mt-1 text-xs text-ink-muted">
          Configuration active (variables d&apos;environnement — aucun secret affiché).
        </p>
        <dl className="mt-4 space-y-2">
          {envRows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 text-sm">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd>
                <Badge tone={r.tone}>{r.value}</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
