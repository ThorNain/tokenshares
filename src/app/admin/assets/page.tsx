/** Vue actifs : catalogue, activation/désactivation, marges, ajout. */
import { prisma } from "@/lib/db";
import { getMarginRate } from "@/lib/settings";
import { TableWrap, Table, TH, TD, Badge } from "@/components/ui";
import { AssetToggle, AssetMarginInput, AddAssetForm } from "@/components/admin/asset-controls";
import { formatMoney, formatPercent } from "@/lib/utils";
import { MARKET_INDEX_LABELS, asMarketIndex } from "@/lib/status";
import { Totem } from "@/components/totem";

export const dynamic = "force-dynamic";

export default async function AdminAssetsPage() {
  const [assets, globalMargin] = await Promise.all([
    prisma.asset.findMany({
      orderBy: [{ indexName: "asc" }, { ticker: "asc" }],
      include: { _count: { select: { orderItems: true } } },
    }),
    getMarginRate(),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Catalogue d&apos;actifs</h2>
          <p className="text-sm text-ink-muted">
            Marge globale actuelle : {formatPercent(globalMargin)} (modifiable dans Paramètres).
          </p>
        </div>
        <AddAssetForm />
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Actif</TH>
              <TH>Totem (objet)</TH>
              <TH>ID produit</TH>
              <TH>Indice</TH>
              <TH>Pays</TH>
              <TH className="text-right">Token ID</TH>
              <TH className="text-right">Prix de base</TH>
              <TH>Marge spécifique</TH>
              <TH className="text-right">Ventes</TH>
              <TH>Statut</TH>
              <TH />
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="hover:bg-cream/60">
                <TD>
                  <span className="font-medium">{a.name}</span>{" "}
                  <span className="text-xs text-ink-muted">({a.ticker})</span>
                </TD>
                <TD className="text-xs">
                  {a.totemName ? (
                    <div className="flex min-w-48 items-center gap-2">
                      <Totem image={a.totemImage} emoji={a.totemEmoji} initials={a.initials} name={a.totemName} size="sm" />
                      <span>{a.totemName}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="font-mono text-[10px]">{a.id}</TD>
                <TD className="text-xs">{MARKET_INDEX_LABELS[asMarketIndex(a.indexName)]}</TD>
                <TD className="text-xs">{a.country}</TD>
                <TD className="text-right tabular">{a.tokenId}</TD>
                <TD className="text-right tabular">{formatMoney(a.basePrice, a.currency)}</TD>
                <TD>
                  <AssetMarginInput assetId={a.id} marginRateOverride={a.marginRateOverride} />
                </TD>
                <TD className="text-right tabular">{a._count.orderItems}</TD>
                <TD>
                  <Badge tone={a.active ? "success" : "neutral"}>
                    {a.active ? "● Actif" : "● Désactivé"}
                  </Badge>
                </TD>
                <TD>
                  <AssetToggle assetId={a.id} active={a.active} />
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
