/**
 * Filtres de la liste des commandes admin (sections 18-19) : traduit les
 * paramètres d'URL en clause `where` Prisma. Partagé entre la page
 * /admin/orders et les exports CSV/JSON pour garantir des résultats
 * identiques.
 */
import type { Prisma } from "@prisma/client";

export interface OrderListParams {
  q?: string;
  email?: string;
  client?: string;
  orderId?: string;
  ticker?: string;
  indexName?: string;
  productId?: string;
  status?: string;
  paymentStatus?: string;
  hedgingStatus?: string;
  mintStatus?: string;
  shippingStatus?: string;
  flag?: string;
  quick?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
}

export const QUICK_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "payment_pending", label: "Paiements en attente" },
  { key: "payment_confirmed", label: "Paiements confirmés" },
  { key: "hedge_pending", label: "Couverture en attente" },
  { key: "minting", label: "Tokens en création" },
  { key: "minted", label: "Tokens créés" },
  { key: "transfer_pending", label: "Transferts en attente" },
  { key: "transfer_confirmed", label: "Transferts confirmés" },
  { key: "errors", label: "En erreur" },
  { key: "to_ship", label: "À expédier" },
  { key: "shipped", label: "Expédiées" },
  { key: "completed", label: "Terminées" },
  { key: "refunded", label: "Remboursées" },
];

const PAID_STATUSES = [
  "paid",
  "hedge_simulated",
  "mint_pending",
  "minted",
  "shipping_pending",
  "shipped",
  "delivered",
];

function quickFilterWhere(quick: string): Prisma.OrderWhereInput {
  switch (quick) {
    case "payment_pending":
      return { OR: [{ status: "pending_payment" }, { payment: { status: { in: ["pending", "processing"] } } }] };
    case "payment_confirmed":
      return { status: { in: PAID_STATUSES } };
    case "hedge_pending":
      return { hedgingOrder: { status: { in: ["not_started", "pending", "processing"] } } };
    case "minting":
      return { tokenMint: { status: { in: ["queued", "minting", "mint_submitted"] } } };
    case "minted":
      return { tokenMint: { status: { in: ["mint_confirmed", "transfer_confirmed"] } } };
    case "transfer_pending":
      return { tokenMint: { status: { in: ["transfer_pending", "transfer_submitted"] } } };
    case "transfer_confirmed":
      return { tokenMint: { status: "transfer_confirmed" } };
    case "errors":
      return {
        OR: [
          { status: "failed" },
          { payment: { status: "failed" } },
          { hedgingOrder: { status: "failed" } },
          { tokenMint: { status: "failed" } },
        ],
      };
    case "to_ship":
      return { status: "shipping_pending" };
    case "shipped":
      return { status: "shipped" };
    case "completed":
      return { status: "delivered" };
    case "refunded":
      return { status: "refunded" };
    default:
      return {};
  }
}

export function buildOrderWhere(params: OrderListParams): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (params.quick && params.quick !== "all") {
    and.push(quickFilterWhere(params.quick));
  }
  if (params.q) {
    const q = params.q.trim();
    and.push({
      OR: [
        { publicId: { contains: q } },
        { id: { contains: q } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
        { items: { some: { asset: { name: { contains: q } } } } },
        { items: { some: { asset: { ticker: { contains: q } } } } },
        { items: { some: { assetId: { contains: q } } } },
      ],
    });
  }
  if (params.email) and.push({ user: { email: { contains: params.email.trim() } } });
  if (params.client) {
    const c = params.client.trim();
    and.push({
      user: { OR: [{ firstName: { contains: c } }, { lastName: { contains: c } }] },
    });
  }
  if (params.orderId) {
    const id = params.orderId.trim();
    and.push({ OR: [{ id: { contains: id } }, { publicId: { contains: id } }] });
  }
  if (params.ticker) and.push({ items: { some: { asset: { ticker: params.ticker } } } });
  if (params.indexName) and.push({ items: { some: { asset: { indexName: params.indexName } } } });
  if (params.productId) and.push({ items: { some: { assetId: params.productId } } });
  if (params.status) and.push({ status: params.status });
  if (params.paymentStatus) and.push({ payment: { status: params.paymentStatus } });
  if (params.hedgingStatus) and.push({ hedgingOrder: { status: params.hedgingStatus } });
  if (params.mintStatus) and.push({ tokenMint: { status: params.mintStatus } });
  if (params.shippingStatus) and.push({ physicalItem: { status: params.shippingStatus } });
  if (params.flag === "error") and.push(quickFilterWhere("errors"));
  if (params.flag === "needs_action") {
    and.push({ OR: [{ needsReview: true }, quickFilterWhere("errors")] });
  }
  if (params.dateFrom) {
    const from = new Date(params.dateFrom);
    if (!Number.isNaN(from.getTime())) and.push({ createdAt: { gte: from } });
  }
  if (params.dateTo) {
    const to = new Date(params.dateTo);
    if (!Number.isNaN(to.getTime())) {
      to.setDate(to.getDate() + 1); // inclusif
      and.push({ createdAt: { lt: to } });
    }
  }

  return and.length > 0 ? { AND: and } : {};
}

export function buildOrderOrderBy(sort?: string): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "createdAt_asc":
      return { createdAt: "asc" };
    case "total_desc":
      return { totalAmount: "desc" };
    case "total_asc":
      return { totalAmount: "asc" };
    case "status":
      return { status: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

export function parsePagination(params: OrderListParams): { page: number; pageSize: number } {
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize ?? "25") || 25));
  return { page, pageSize };
}
