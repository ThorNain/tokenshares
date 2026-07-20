/** Catalogue complet des actifs, filtrable par indice, pays, nom et ticker. */
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { AssetCatalog } from "@/components/asset-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Catalogue d'actifs" };

export default async function AssetsPage() {
  const assets = await getCatalog();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Catalogue d&apos;actifs</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Sélection issue du S&amp;P 500, du CAC 40 et du Nikkei 225. Prix indicatifs simulés — le
        prix final inclut la marge commerciale affichée.
      </p>
      <div className="mt-8">
        <AssetCatalog assets={assets} />
      </div>
    </div>
  );
}
