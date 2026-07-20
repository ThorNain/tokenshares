/**
 * Page d'accueil : proposition de valeur, aperçu du catalogue, fonctionnement,
 * avertissements de transparence.
 */
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { AssetCatalog } from "@/components/asset-catalog";
import { IconBank, IconCoins, IconShield, IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featured = (await getCatalog()).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* Héro */}
      <section className="py-16 text-center sm:py-24">
        <p className="mx-auto mb-4 w-fit rounded-full border border-ink/10 bg-white px-4 py-1 text-xs font-medium text-ink-muted">
          Prototype de démonstration — aucun investissement réel
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Un token numérique, indexé sur une action cotée.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
          Choisissez une valeur du S&amp;P 500, du CAC 40 ou du Nikkei 225. Payez en mode test,
          recevez un token de démonstration dans votre wallet, et un objet souvenir avec QR code
          chez vous.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Découvrir les actifs <IconArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/risk-disclosure"
            className="inline-flex items-center rounded-full border border-ink/15 bg-white px-6 py-3 text-sm font-medium text-ink hover:bg-ink/5"
          >
            Comprendre les risques
          </Link>
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="grid gap-6 py-8 sm:grid-cols-3">
        {[
          {
            icon: IconBank,
            title: "1. Choisissez une action",
            text: "15 grandes valeurs internationales. Prix indicatif simulé, marge de 10 % affichée avant paiement.",
          },
          {
            icon: IconCoins,
            title: "2. Recevez votre token",
            text: "Après paiement (mode test), un token de démonstration ERC-1155 est émis sur un réseau d'essai, directement dans votre wallet.",
          },
          {
            icon: IconShield,
            title: "3. Gardez le contrôle",
            text: "Wallet non-custodial : la clé privée ne quitte jamais votre appareil. Un QR code sécurisé relie l'objet physique à votre commande.",
          },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-card">
            <f.icon className="h-6 w-6 text-accent" />
            <h2 className="mt-4 font-semibold text-ink">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.text}</p>
          </div>
        ))}
      </section>

      {/* Aperçu du catalogue */}
      <section className="py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Sélection d&apos;actifs</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Prix indicatifs simulés, actualisés en continu.
            </p>
          </div>
          <Link href="/assets" className="text-sm font-medium text-accent hover:underline">
            Tout le catalogue →
          </Link>
        </div>
        {featured.length > 0 ? (
          <AssetCatalog assets={featured} />
        ) : (
          <p className="rounded-2xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-muted">
            Le catalogue est vide. Exécutez <code className="font-mono">npm run seed</code> pour
            charger les données de démonstration.
          </p>
        )}
      </section>

      {/* Transparence */}
      <section className="my-12 rounded-2xl bg-ink px-8 py-10 text-white">
        <h2 className="text-lg font-semibold">Transparence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80">
          Le prix affiché comprend le prix indicatif de l&apos;actif simulé ainsi qu&apos;une marge
          commerciale de 10 %. Dans cette version de démonstration, aucune action réelle n&apos;est
          achetée et le token émis sur la blockchain de test ne constitue ni une action, ni un
          instrument financier, ni un droit de propriété sur une entreprise cotée.
        </p>
      </section>
    </div>
  );
}
