/**
 * Tableau de bord global de l'entreprise (section 22) : indicateurs
 * commerciaux, opérationnels, répartition par indice et par actif.
 */
import Link from "next/link";
import { getAdminDashboardStats, type MoneyByCurrency } from "@/lib/admin-stats";
import { Card, TableWrap, Table, TH, TD, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/utils";
import { MARKET_INDEX_LABELS, asMarketIndex } from "@/lib/status";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";

export const dynamic = "force-dynamic";

function Money({ list }: { list: MoneyByCurrency[] }) {
  if (list.length === 0) return <>—</>;
  const totalInEuro = list.reduce(
    (total, money) => total + convertToEuro(money.amount, money.currency),
    0,
  );
  return <>{formatMoney(totalInEuro, EURO_CURRENCY)}</>;
}

function Stat({ label, value, href }: { label: string; value: React.ReactNode; href?: string }) {
  const inner = (
    <Card className="h-full p-5 transition-shadow hover:shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular text-ink">{value}</p>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();
  const c = stats.commercial;
  const o = stats.operational;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Indicateurs commerciaux
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Commandes (total)" value={c.totalOrders} href="/admin/orders" />
          <Stat label="Commandes du jour" value={c.ordersToday} />
          <Stat label="Chiffre d'affaires total" value={<Money list={c.revenueTotal} />} />
          <Stat label="CA du mois" value={<Money list={c.revenueThisMonth} />} />
          <Stat label="Marge brute totale" value={<Money list={c.grossMarginTotal} />} />
          <Stat label="Marge moyenne / commande" value={<Money list={c.avgMarginPerOrder} />} />
          <Stat label="Clients" value={c.customersCount} href="/admin/users" />
          <Stat label="Nouveaux clients (mois)" value={c.newCustomersThisMonth} />
          <Stat label="Panier moyen" value={<Money list={c.avgBasket} />} />
          <Stat label="Tokens vendus" value={c.tokensSold} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Indicateurs opérationnels
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Paiements en attente" value={o.paymentsPending} href="/admin/orders?quick=payment_pending" />
          <Stat label="Paiements échoués" value={o.paymentsFailed} href="/admin/orders?paymentStatus=failed" />
          <Stat label="Couvertures en attente" value={o.hedgesPending} href="/admin/orders?quick=hedge_pending" />
          <Stat label="Couvertures échouées" value={o.hedgesFailed} href="/admin/orders?hedgingStatus=failed" />
          <Stat label="Tokens en création" value={o.mintsInProgress} href="/admin/orders?quick=minting" />
          <Stat label="Tokens en erreur" value={o.mintsFailed} href="/admin/orders?mintStatus=failed" />
          <Stat label="Transferts en attente" value={o.transfersPending} href="/admin/orders?quick=transfer_pending" />
          <Stat label="À expédier" value={o.toShip} href="/admin/orders?quick=to_ship" />
          <Stat label="Expédiées" value={o.shipped} href="/admin/orders?quick=shipped" />
          <Stat label="Terminées" value={o.completed} href="/admin/orders?quick=completed" />
        </div>
        {o.needsReview > 0 ? (
          <p className="mt-4">
            <Link href="/admin/orders?flag=needs_action" className="text-sm font-medium text-warning hover:underline">
              ⚠ {o.needsReview} commande(s) nécessitent une vérification manuelle →
            </Link>
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Répartition par indice
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.byIndex.map((idx) => (
            <Card key={idx.indexName} className="p-5">
              <p className="font-semibold text-ink">
                {MARKET_INDEX_LABELS[asMarketIndex(idx.indexName)]}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {idx.orders} commande(s) · {idx.quantity} token(s)
              </p>
              <p className="mt-1 text-sm font-medium tabular text-ink">
                <Money list={idx.revenue} />
              </p>
            </Card>
          ))}
          {stats.byIndex.length === 0 ? (
            <p className="text-sm text-ink-muted">Aucune vente pour l&apos;instant.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Performance par actif
        </h2>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <TH>Actif</TH>
                <TH>Indice</TH>
                <TH className="text-right">Quantité vendue</TH>
                <TH className="text-right">Chiffre d&apos;affaires</TH>
                <TH className="text-right">Marge</TH>
                <TH className="text-right">Clients</TH>
              </tr>
            </thead>
            <tbody>
              {stats.byAsset.map((a, i) => (
                <tr key={a.assetId} className="hover:bg-cream/60">
                  <TD>
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-xs text-ink-muted">({a.ticker})</span>
                    {i === 0 ? <Badge tone="info" className="ml-2">Top vente</Badge> : null}
                  </TD>
                  <TD className="text-xs">{MARKET_INDEX_LABELS[asMarketIndex(a.indexName)]}</TD>
                  <TD className="text-right tabular">{a.quantity}</TD>
                  <TD className="text-right tabular">{formatMoney(a.revenue, a.currency)}</TD>
                  <TD className="text-right tabular">{formatMoney(a.margin, a.currency)}</TD>
                  <TD className="text-right tabular">{a.customers}</TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </section>
    </div>
  );
}
