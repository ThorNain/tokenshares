/**
 * Indicateurs du tableau de bord entreprise (/admin — section 22) :
 * commerciaux, opérationnels, par indice et par actif.
 * Les montants sont agrégés PAR DEVISE (le catalogue mêle EUR, USD, JPY).
 */
import "server-only";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";
import { prisma } from "@/lib/db";

/** Statuts « chiffre d'affaires encaissé » (payé, non remboursé). */
const REVENUE_STATUSES = [
  "paid",
  "hedge_simulated",
  "mint_pending",
  "minted",
  "shipping_pending",
  "shipped",
  "delivered",
];

export interface MoneyByCurrency {
  currency: string;
  amount: number;
}

export interface AdminDashboardStats {
  commercial: {
    totalOrders: number;
    ordersToday: number;
    revenueTotal: MoneyByCurrency[];
    revenueThisMonth: MoneyByCurrency[];
    grossMarginTotal: MoneyByCurrency[];
    avgMarginPerOrder: MoneyByCurrency[];
    customersCount: number;
    newCustomersThisMonth: number;
    avgBasket: MoneyByCurrency[];
    tokensSold: number;
  };
  operational: {
    paymentsPending: number;
    paymentsFailed: number;
    hedgesPending: number;
    hedgesFailed: number;
    mintsInProgress: number;
    mintsFailed: number;
    transfersPending: number;
    toShip: number;
    shipped: number;
    completed: number;
    refunded: number;
    needsReview: number;
  };
  byIndex: { indexName: string; orders: number; quantity: number; revenue: MoneyByCurrency[] }[];
  byAsset: {
    assetId: string;
    ticker: string;
    name: string;
    indexName: string;
    currency: string;
    quantity: number;
    revenue: number;
    margin: number;
    customers: number;
  }[];
}

function addMoney(map: Map<string, number>, currency: string, amount: number): void {
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

function toMoneyList(map: Map<string, number>): MoneyByCurrency[] {
  return Array.from(map.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    ordersToday,
    revenueOrders,
    customersCount,
    newCustomersThisMonth,
    paymentsPending,
    paymentsFailed,
    hedgesPending,
    hedgesFailed,
    mintsInProgress,
    mintsFailed,
    transfersPending,
    toShip,
    shipped,
    completed,
    refunded,
    needsReview,
    mintedItems,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES } },
      include: { items: { include: { asset: true } }, user: true },
    }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.user.count({ where: { role: "customer", createdAt: { gte: startOfMonth } } }),
    prisma.payment.count({ where: { status: { in: ["pending", "processing"] } } }),
    prisma.payment.count({ where: { status: "failed" } }),
    prisma.hedgingOrder.count({ where: { status: { in: ["not_started", "pending", "processing"] } } }),
    prisma.hedgingOrder.count({ where: { status: "failed" } }),
    prisma.tokenMint.count({ where: { status: { in: ["queued", "minting", "mint_submitted"] } } }),
    prisma.tokenMint.count({ where: { status: "failed" } }),
    prisma.tokenMint.count({
      where: { status: { in: ["mint_confirmed", "transfer_pending", "transfer_submitted"] } },
    }),
    prisma.order.count({ where: { status: "shipping_pending" } }),
    prisma.order.count({ where: { status: "shipped" } }),
    prisma.order.count({ where: { status: "delivered" } }),
    prisma.order.count({ where: { status: "refunded" } }),
    prisma.order.count({ where: { needsReview: true } }),
    prisma.tokenMint.aggregate({ where: { status: "transfer_confirmed" }, _sum: { quantity: true } }),
  ]);

  const revenueTotal = new Map<string, number>();
  const revenueMonth = new Map<string, number>();
  const marginTotal = new Map<string, number>();
  const ordersByCurrency = new Map<string, number>();

  const byIndexAcc = new Map<
    string,
    { orders: number; quantity: number; revenue: Map<string, number> }
  >();
  const byAssetAcc = new Map<
    string,
    {
      ticker: string;
      name: string;
      indexName: string;
      currency: string;
      quantity: number;
      revenue: number;
      margin: number;
      customers: Set<string>;
    }
  >();

  for (const order of revenueOrders) {
    addMoney(revenueTotal, order.currency, order.totalAmount);
    addMoney(marginTotal, order.currency, order.marginAmount);
    ordersByCurrency.set(order.currency, (ordersByCurrency.get(order.currency) ?? 0) + 1);
    if (order.createdAt >= startOfMonth) {
      addMoney(revenueMonth, order.currency, order.totalAmount);
    }
    for (const item of order.items) {
      const idx = byIndexAcc.get(item.asset.indexName) ?? {
        orders: 0,
        quantity: 0,
        revenue: new Map<string, number>(),
      };
      idx.orders += 1;
      idx.quantity += item.quantity;
      addMoney(idx.revenue, item.currency, item.unitSellingPrice * item.quantity);
      byIndexAcc.set(item.asset.indexName, idx);

      const acc = byAssetAcc.get(item.assetId) ?? {
        ticker: item.asset.ticker,
        name: item.asset.name,
        indexName: item.asset.indexName,
        currency: EURO_CURRENCY,
        quantity: 0,
        revenue: 0,
        margin: 0,
        customers: new Set<string>(),
      };
      acc.quantity += item.quantity;
      acc.revenue += convertToEuro(item.unitSellingPrice * item.quantity, item.currency);
      acc.margin += convertToEuro(item.marginAmount, item.currency);
      acc.customers.add(order.userId);
      byAssetAcc.set(item.assetId, acc);
    }
  }

  const avgMargin = new Map<string, number>();
  const avgBasket = new Map<string, number>();
  for (const [currency, count] of ordersByCurrency.entries()) {
    avgMargin.set(currency, (marginTotal.get(currency) ?? 0) / count);
    avgBasket.set(currency, (revenueTotal.get(currency) ?? 0) / count);
  }

  return {
    commercial: {
      totalOrders,
      ordersToday,
      revenueTotal: toMoneyList(revenueTotal),
      revenueThisMonth: toMoneyList(revenueMonth),
      grossMarginTotal: toMoneyList(marginTotal),
      avgMarginPerOrder: toMoneyList(avgMargin),
      customersCount,
      newCustomersThisMonth,
      avgBasket: toMoneyList(avgBasket),
      tokensSold: mintedItems._sum.quantity ?? 0,
    },
    operational: {
      paymentsPending,
      paymentsFailed,
      hedgesPending,
      hedgesFailed,
      mintsInProgress,
      mintsFailed,
      transfersPending,
      toShip,
      shipped,
      completed,
      refunded,
      needsReview,
    },
    byIndex: Array.from(byIndexAcc.entries()).map(([indexName, acc]) => ({
      indexName,
      orders: acc.orders,
      quantity: acc.quantity,
      revenue: toMoneyList(acc.revenue),
    })),
    byAsset: Array.from(byAssetAcc.entries())
      .map(([assetId, acc]) => ({
        assetId,
        ticker: acc.ticker,
        name: acc.name,
        indexName: acc.indexName,
        currency: acc.currency,
        quantity: acc.quantity,
        revenue: acc.revenue,
        margin: acc.margin,
        customers: acc.customers.size,
      }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}
