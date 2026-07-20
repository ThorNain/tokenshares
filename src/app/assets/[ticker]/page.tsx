/**
 * Fiche actif : prix indicatif, marge explicite, prix final, encadré d'achat
 * et texte de transparence (section 14).
 */
import { notFound } from "next/navigation";
import Image from "next/image";
import { getAssetDetail } from "@/lib/catalog";
import { getSession } from "@/lib/session";
import { BuyBox } from "@/components/buy-box";
import { Totem } from "@/components/totem";
import { Badge, Card } from "@/components/ui";
import { formatMoney, formatPercent, formatDateTime } from "@/lib/utils";
import { MARKET_INDEX_LABELS, asMarketIndex } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function AssetPage({ params }: { params: { ticker: string } }) {
  const ticker = decodeURIComponent(params.ticker);
  const detail = await getAssetDetail(ticker);
  if (!detail) notFound();
  const session = await getSession();
  const { asset, quote, marginRate, unitPrice, unitFinalPrice, displayCurrency } = detail;
  const up = quote.changePercent24h >= 0;
  const productGallery =
    asset.ticker === "7974.T"
      ? [
          {
            src: "/totems/nintendo-mushroom.png",
            alt: "Champignon de jeu miniature sur fond ivoire",
            caption: "Vue produit",
          },
          {
            src: "/totems/nintendo-in-hand.png",
            alt: "Champignon de jeu miniature dans la main d'une personne",
            caption: "Format réel — environ 6 cm",
          },
          {
            src: "/totems/nintendo-qr-detail.png",
            alt: "QR code illustratif placé sous le champignon miniature",
            caption: "QR sécurisé sous la base",
          },
        ]
      : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr,380px]">
        <div>
          <div className="flex items-center gap-4">
            <Totem image={asset.totemImage} emoji={asset.totemEmoji} initials={asset.initials} name={asset.totemName} size="lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{asset.name}</h1>
              <p className="text-sm text-ink-muted">
                {asset.ticker} · {MARKET_INDEX_LABELS[asMarketIndex(asset.indexName)]} ·{" "}
                {asset.country}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-baseline gap-4">
            <p className="text-4xl font-semibold tabular text-ink">
              {formatMoney(unitPrice, displayCurrency)}
            </p>
            <Badge tone={up ? "success" : "danger"}>
              {up ? "▲" : "▼"} {formatPercent(Math.abs(quote.changePercent24h), 2)} sur 24 h
              (simulé)
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {quote.source === "yahoo-finance"
              ? "Prix indicatif Yahoo Finance (différé ~15 min)"
              : "Prix indicatif simulé"}{" "}
            · {formatDateTime(quote.asOf)} · affiché en EUR (cours source : {quote.currency})
          </p>

          <Card className="mt-8 p-6">
            <h2 className="font-semibold text-ink">Détail du prix</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Prix indicatif de l&apos;action</dt>
                <dd className="tabular text-ink">{formatMoney(unitPrice, displayCurrency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Marge commerciale ({formatPercent(marginRate)})</dt>
                <dd className="tabular text-ink">
                  {formatMoney(unitFinalPrice - unitPrice, displayCurrency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 font-semibold">
                <dt className="text-ink">Prix final par token</dt>
                <dd className="tabular text-ink">{formatMoney(unitFinalPrice, displayCurrency)}</dd>
              </div>
            </dl>
          </Card>

          {asset.totemName ? (
            <Card className="mt-8 overflow-hidden p-0">
              <div className="grid sm:grid-cols-[220px,1fr]">
                <Totem image={asset.totemImage} emoji={asset.totemEmoji} initials={asset.initials} name={asset.totemName} size="card" className="h-56 rounded-none border-0 shadow-none sm:h-full" />
                <div className="p-6">
                  <h2 className="font-semibold text-ink">Objet de collection inclus</h2>
                  <p className="mt-1 text-sm font-medium text-ink-soft">{asset.totemName}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    Chaque commande est accompagnée de cet objet souvenir, expédié à votre
                    adresse. Il porte un QR code sécurisé qui relie physiquement l&apos;objet à
                    votre commande et à votre portefeuille — sans jamais contenir de clé privée
                    ni de donnée personnelle.
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {productGallery.length > 0 ? (
            <section className="mt-8" aria-labelledby="product-gallery-title">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="product-gallery-title" className="font-semibold text-ink">
                    Le produit en détail
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Aperçu du format et de l&apos;emplacement du QR code.
                  </p>
                </div>
                <p className="text-xs text-ink-muted">Photos de présentation</p>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {productGallery.map((photo) => (
                  <figure key={photo.src} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                    <div className="relative aspect-square overflow-hidden bg-cream">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes="(min-width: 640px) 30vw, 100vw"
                        className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    </div>
                    <figcaption className="px-4 py-3 text-xs font-medium text-ink-soft">
                      {photo.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                Le QR code visible sur la photo est illustratif. Chaque commande reçoit un QR code
                unique généré par l&apos;application, sans clé privée ni donnée personnelle.
              </p>
            </section>
          ) : null}

          <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 text-sm leading-relaxed text-ink-muted">
            <h2 className="mb-2 font-semibold text-ink">Transparence</h2>
            <p>
              Le prix affiché comprend le prix indicatif de l&apos;actif simulé ainsi qu&apos;une
              marge commerciale de {formatPercent(marginRate)}. Dans cette version de
              démonstration, aucune action réelle n&apos;est achetée et le token émis sur la
              blockchain de test ne constitue ni une action, ni un instrument financier, ni un
              droit de propriété sur une entreprise cotée.
            </p>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <BuyBox
            ticker={asset.ticker}
            currency={displayCurrency}
            unitPrice={unitPrice}
            unitFinalPrice={unitFinalPrice}
            marginRate={marginRate}
            isAuthenticated={Boolean(session)}
          />
        </div>
      </div>
    </div>
  );
}
