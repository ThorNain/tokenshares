"use client";

/**
 * Catalogue d'actifs avec filtres instantanés : indice, pays, nom, ticker.
 * Chaque carte affiche prix indicatif, marge et prix final (section 4).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Input, Select, Badge } from "@/components/ui";
import { IconSearch, IconArrowRight } from "@/components/icons";
import { Totem } from "@/components/totem";
import { formatMoney, formatPercent, cn } from "@/lib/utils";
import { MARKET_INDEX_LABELS, asMarketIndex } from "@/lib/status";

export interface CatalogAsset {
  ticker: string;
  name: string;
  indexName: string;
  country: string;
  currency: string;
  initials: string;
  totemImage: string | null;
  totemEmoji: string | null;
  totemName: string | null;
  price: number;
  finalPrice: number;
  marginRate: number;
  changePercent24h: number;
}

export function AssetCatalog({ assets }: { assets: CatalogAsset[] }) {
  const [query, setQuery] = useState("");
  const [indexFilter, setIndexFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const countries = useMemo(
    () => Array.from(new Set(assets.map((a) => a.country))).sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (indexFilter && a.indexName !== indexFilter) return false;
      if (countryFilter && a.country !== countryFilter) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.ticker.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [assets, query, indexFilter, countryFilter]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou ticker…"
            className="pl-9"
            aria-label="Rechercher un actif"
          />
        </div>
        <Select
          value={indexFilter}
          onChange={(e) => setIndexFilter(e.target.value)}
          className="sm:w-48"
          aria-label="Filtrer par indice"
        >
          <option value="">Tous les indices</option>
          <option value="SP500">S&amp;P 500</option>
          <option value="CAC40">CAC 40</option>
          <option value="NIKKEI225">Nikkei 225</option>
        </Select>
        <Select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="sm:w-48"
          aria-label="Filtrer par pays"
        >
          <option value="">Tous les pays</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-muted">
          Aucun actif ne correspond à votre recherche.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((asset) => (
            <AssetCard key={asset.ticker} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset }: { asset: CatalogAsset }) {
  const up = asset.changePercent24h >= 0;
  return (
    <Card className="group flex flex-col overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative p-3 pb-0">
        <Totem
          image={asset.totemImage}
          emoji={asset.totemEmoji}
          initials={asset.initials}
          name={asset.totemName}
          size="card"
          className="transition-transform duration-300 group-hover:scale-[1.015]"
        />
        <Badge tone={up ? "success" : "danger"} className="absolute right-5 top-5 shadow-sm">
          {up ? "▲" : "▼"} {formatPercent(Math.abs(asset.changePercent24h), 2)}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-6 pt-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-lg font-semibold leading-tight text-ink">{asset.name}</p>
            <p className="text-xs text-ink-muted">
              {asset.ticker} · {MARKET_INDEX_LABELS[asMarketIndex(asset.indexName)]} · {asset.country}
            </p>
          </div>
        </div>
      </div>

      <dl className="mt-5 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Prix indicatif</dt>
          <dd className="tabular font-medium text-ink">
            {formatMoney(asset.price, asset.currency)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Marge ({formatPercent(asset.marginRate)})</dt>
          <dd className="tabular text-ink-soft">
            {formatMoney(asset.finalPrice - asset.price, asset.currency)}
          </dd>
        </div>
        <div className="mt-2 flex items-end justify-between border-t border-ink/10 pt-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">Prix final</dt>
          <dd className={cn("tabular text-xl font-semibold text-ink")}>
            {formatMoney(asset.finalPrice, asset.currency)}
          </dd>
        </div>
      </dl>

      {asset.totemName ? (
        <p className="mt-4 rounded-xl bg-cream px-3 py-2 text-xs text-ink-soft">
          <span className="font-medium text-ink">Objet physique inclus</span><br />
          {asset.totemName}
        </p>
      ) : null}

      <Link
        href={`/assets/${encodeURIComponent(asset.ticker)}`}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Acheter <IconArrowRight className="h-4 w-4" />
      </Link>
      </div>
    </Card>
  );
}
