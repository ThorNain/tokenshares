/**
 * Page d'accueil : proposition de valeur, aperçu du catalogue, fonctionnement,
 * avertissements de transparence. Textes issus des dictionnaires i18n.
 */
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { AssetCatalog } from "@/components/asset-catalog";
import { IconBank, IconCoins, IconShield, IconArrowRight } from "@/components/icons";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const STEP_ICONS = [IconBank, IconCoins, IconShield];

export default async function HomePage() {
  const featured = (await getCatalog()).slice(0, 6);
  const t = getT().home;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Héro */}
      <section className="py-16 text-center sm:py-24">
        <p className="mx-auto mb-4 w-fit rounded-full border border-ink/10 bg-surface px-4 py-1 text-xs font-medium text-ink-muted">
          {t.pill}
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {t.h1}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
          {t.subtitle}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-hover"
          >
            {t.ctaAssets} <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/risk-disclosure"
            className="inline-flex items-center rounded-full border border-ink/15 bg-surface px-6 py-3 text-sm font-medium text-ink hover:bg-ink/5"
          >
            {t.ctaRisks}
          </Link>
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="grid gap-6 py-8 sm:grid-cols-3">
        {t.steps.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? IconBank;
          return (
            <div
              key={step.title}
              className="rounded-2xl border border-ink/10 bg-surface p-6 shadow-card"
            >
              <Icon className="h-6 w-6 text-accent" />
              <h2 className="mt-4 font-semibold text-ink">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.text}</p>
            </div>
          );
        })}
      </section>

      {/* Aperçu du catalogue */}
      <section className="py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">{t.catalogTitle}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t.catalogSubtitle}</p>
          </div>
          <Link href="/assets" className="text-sm font-medium text-accent hover:underline">
            {t.catalogAll}
          </Link>
        </div>
        {featured.length > 0 ? (
          <AssetCatalog assets={featured} />
        ) : (
          <p className="rounded-2xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-muted">
            {t.catalogEmptyBefore} <code className="font-mono">npm run seed</code>{" "}
            {t.catalogEmptyAfter}
          </p>
        )}
      </section>

      {/* Transparence */}
      <section className="my-12 rounded-2xl bg-panel px-8 py-10 text-white">
        <h2 className="text-lg font-semibold">{t.transparencyTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">{t.transparencyText}</p>
      </section>
    </div>
  );
}
