/**
 * Liste des commandes (sections 18-19) : recherche, filtres complets,
 * filtres rapides, tri, pagination, export CSV/JSON, sélection multiple et
 * actions groupées (via le composant client).
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  buildOrderWhere,
  buildOrderOrderBy,
  parsePagination,
  QUICK_FILTERS,
  type OrderListParams,
} from "@/lib/order-filters";
import { listOrderInclude } from "@/lib/order-includes";
import { AdminOrdersTable, type AdminOrderRow } from "@/components/admin/orders-table";
import { Input, Select, Button } from "@/components/ui";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  HEDGING_STATUSES,
  HEDGING_STATUS_LABELS,
  MINT_STATUSES,
  MINT_STATUS_LABELS,
  PHYSICAL_STATUSES,
  PHYSICAL_STATUS_LABELS,
} from "@/lib/status";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: OrderListParams;
}) {
  const where = buildOrderWhere(searchParams);
  const orderBy = buildOrderOrderBy(searchParams.sort);
  const { page, pageSize } = parsePagination(searchParams);

  const [total, orders, tickers] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: listOrderInclude,
    }),
    prisma.asset.findMany({ select: { ticker: true }, orderBy: { ticker: "asc" } }),
  ]);

  const rows: AdminOrderRow[] = orders.map((o) => {
    const item = o.items[0];
    return {
      id: o.id,
      publicId: o.publicId,
      createdAt: o.createdAt.toISOString(),
      lastName: o.user.lastName ?? "",
      firstName: o.user.firstName ?? "",
      email: o.user.email,
      privyUserId: o.user.privyUserId ?? "",
      wallet: o.user.wallets[0]?.address ?? "",
      productId: item?.assetId ?? "",
      assetName: item?.asset.name ?? "",
      ticker: item?.asset.ticker ?? "",
      indexName: item?.asset.indexName ?? "",
      quantity: item?.quantity ?? 0,
      unitPrice: item?.lockedMarketPrice ?? 0,
      margin: o.marginAmount,
      total: o.totalAmount,
      currency: o.currency,
      paymentStatus: o.payment?.status ?? null,
      stripeId: o.payment?.stripePaymentIntentId ?? o.payment?.stripeSessionId ?? "",
      hedgingStatus: o.hedgingOrder?.status ?? null,
      mintStatus: o.tokenMint?.status ?? null,
      txHash: o.tokenMint?.txHash ?? "",
      shippingStatus: o.physicalItem?.status ?? null,
      trackingNumber: o.physicalItem?.trackingNumber ?? "",
      status: o.status,
      needsReview: o.needsReview,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeQuick = searchParams.quick ?? "all";
  const exportQuery = new URLSearchParams(
    Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as [string, string][],
  ).toString();

  const pageLink = (p: number) => {
    const q = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v) as [string, string][],
    );
    q.set("page", String(p));
    return `/admin/orders?${q.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Commandes <span className="text-sm font-normal text-ink-muted">({total})</span>
        </h2>
        <div className="flex gap-2">
          <a
            href={`/api/admin/orders/export?format=csv${exportQuery ? `&${exportQuery}` : ""}`}
            className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink hover:bg-ink/5"
          >
            Export CSV
          </a>
          <a
            href={`/api/admin/orders/export?format=json${exportQuery ? `&${exportQuery}` : ""}`}
            className="rounded-full border border-ink/15 px-4 py-1.5 text-sm font-medium text-ink hover:bg-ink/5"
          >
            Export JSON
          </a>
        </div>
      </div>

      {/* Filtres rapides */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/orders" : `/admin/orders?quick=${f.key}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              activeQuick === f.key
                ? "bg-ink text-white"
                : "border border-ink/15 bg-white text-ink-soft hover:bg-ink/5",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Filtres détaillés (formulaire GET) */}
      <form method="GET" className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <Input name="q" placeholder="Recherche (nom, e-mail, ID, actif…)" defaultValue={searchParams.q ?? ""} className="sm:col-span-2" />
        <Select name="ticker" defaultValue={searchParams.ticker ?? ""} aria-label="Ticker">
          <option value="">Ticker : tous</option>
          {tickers.map((t) => (
            <option key={t.ticker} value={t.ticker}>{t.ticker}</option>
          ))}
        </Select>
        <Select name="indexName" defaultValue={searchParams.indexName ?? ""} aria-label="Indice">
          <option value="">Indice : tous</option>
          <option value="SP500">S&amp;P 500</option>
          <option value="CAC40">CAC 40</option>
          <option value="NIKKEI225">Nikkei 225</option>
        </Select>
        <Select name="status" defaultValue={searchParams.status ?? ""} aria-label="Statut de commande">
          <option value="">Statut : tous</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select name="paymentStatus" defaultValue={searchParams.paymentStatus ?? ""} aria-label="Statut de paiement">
          <option value="">Paiement : tous</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select name="hedgingStatus" defaultValue={searchParams.hedgingStatus ?? ""} aria-label="Statut de couverture">
          <option value="">Couverture : toutes</option>
          {HEDGING_STATUSES.map((s) => (
            <option key={s} value={s}>{HEDGING_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select name="mintStatus" defaultValue={searchParams.mintStatus ?? ""} aria-label="Statut du token">
          <option value="">Token : tous</option>
          {MINT_STATUSES.map((s) => (
            <option key={s} value={s}>{MINT_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select name="shippingStatus" defaultValue={searchParams.shippingStatus ?? ""} aria-label="Statut de livraison">
          <option value="">Livraison : toutes</option>
          {PHYSICAL_STATUSES.map((s) => (
            <option key={s} value={s}>{PHYSICAL_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select name="flag" defaultValue={searchParams.flag ?? ""} aria-label="Signalement">
          <option value="">Signalement : tous</option>
          <option value="error">En erreur</option>
          <option value="needs_action">Action manuelle requise</option>
        </Select>
        <Input type="date" name="dateFrom" defaultValue={searchParams.dateFrom ?? ""} aria-label="Du" />
        <Input type="date" name="dateTo" defaultValue={searchParams.dateTo ?? ""} aria-label="Au" />
        <Select name="sort" defaultValue={searchParams.sort ?? ""} aria-label="Tri">
          <option value="">Tri : plus récentes</option>
          <option value="createdAt_asc">Plus anciennes</option>
          <option value="total_desc">Montant décroissant</option>
          <option value="total_asc">Montant croissant</option>
          <option value="status">Par statut</option>
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Filtrer</Button>
          <Link href="/admin/orders" className="flex h-10 items-center rounded-full border border-ink/15 px-4 text-sm font-medium text-ink hover:bg-ink/5">
            Réinitialiser
          </Link>
        </div>
      </form>

      <AdminOrdersTable rows={rows} />

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>
            Page {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={pageLink(page - 1)} className="rounded-full border border-ink/15 px-4 py-1.5 font-medium text-ink hover:bg-ink/5">
                ← Précédente
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={pageLink(page + 1)} className="rounded-full border border-ink/15 px-4 py-1.5 font-medium text-ink hover:bg-ink/5">
                Suivante →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
