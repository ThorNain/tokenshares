/**
 * Pied de page : liens légaux et rappel du statut de prototype (section 14).
 */
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink/10 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-ink">TokenShares</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Les tokens émis (ERC-1155) sont indexés à titre informatif sur le cours d&apos;actions
              cotées. Ils ne constituent ni une action, ni un instrument financier, ni un droit de
              propriété sur une entreprise cotée, et ne confèrent aucun dividende ni droit de vote.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Informations
              </p>
              <Link href="/legal" className="block text-ink-soft hover:text-ink">
                Mentions & CGU
              </Link>
              <Link href="/risk-disclosure" className="block text-ink-soft hover:text-ink">
                Avertissement sur les risques
              </Link>
              <Link href="/privacy" className="block text-ink-soft hover:text-ink">
                Confidentialité
              </Link>
              <Link href="/support" className="block text-ink-soft hover:text-ink">
                Aide & support
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Compte</p>
              <Link href="/login" className="block text-ink-soft hover:text-ink">
                Connexion
              </Link>
              <Link href="/dashboard/portfolio" className="block text-ink-soft hover:text-ink">
                Portefeuille
              </Link>
              <Link href="/dashboard/orders" className="block text-ink-soft hover:text-ink">
                Commandes
              </Link>
              <Link href="/redeem" className="block text-ink-soft hover:text-ink">
                Réclamer un cadeau
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-ink/5 pt-6 text-center text-xs text-ink-muted">
          © 2026 TokenShares
        </p>
      </div>
    </footer>
  );
}
