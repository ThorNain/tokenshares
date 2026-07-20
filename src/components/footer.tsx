/**
 * Pied de page : liens légaux et rappel du statut de prototype (section 14).
 */
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-ink">TokenShares (démo)</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              Prototype de démonstration. Les tokens émis sur la blockchain de test ne constituent
              ni une action, ni un instrument financier, ni un droit de propriété sur une
              entreprise cotée. Aucune action réelle n&apos;est achetée, aucun paiement réel
              n&apos;est encaissé.
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
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-ink/5 pt-6 text-center text-xs text-ink-muted">
          © 2026 TokenShares — environnement de démonstration uniquement.
        </p>
      </div>
    </footer>
  );
}
