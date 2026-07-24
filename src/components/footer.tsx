/**
 * Pied de page : liens légaux et rappel factuel sur la nature des tokens.
 */
import Link from "next/link";
import { getT } from "@/lib/i18n";

export function Footer() {
  const t = getT().footer;

  return (
    <footer className="mt-16 border-t border-ink/10 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-ink">TokenShares</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t.informations}
              </p>
              <Link href="/legal" className="block text-ink-soft hover:text-ink">
                {t.legal}
              </Link>
              <Link href="/risk-disclosure" className="block text-ink-soft hover:text-ink">
                {t.risk}
              </Link>
              <Link href="/privacy" className="block text-ink-soft hover:text-ink">
                {t.privacy}
              </Link>
              <Link href="/support" className="block text-ink-soft hover:text-ink">
                {t.support}
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {t.account}
              </p>
              <Link href="/login" className="block text-ink-soft hover:text-ink">
                {t.login}
              </Link>
              <Link href="/dashboard/portfolio" className="block text-ink-soft hover:text-ink">
                {t.portfolio}
              </Link>
              <Link href="/dashboard/orders" className="block text-ink-soft hover:text-ink">
                {t.orders}
              </Link>
              <Link href="/redeem" className="block text-ink-soft hover:text-ink">
                {t.redeem}
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t border-ink/5 pt-6 text-center text-xs text-ink-muted">
          {t.copyright}
        </p>
      </div>
    </footer>
  );
}
