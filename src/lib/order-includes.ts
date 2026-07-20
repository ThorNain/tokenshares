/**
 * Includes Prisma partagés pour charger une commande complète (fiche admin,
 * pipeline, timeline) avec un type dérivé strict.
 */
import { Prisma } from "@prisma/client";

export const fullOrderInclude = {
  user: { include: { wallets: true } },
  items: { include: { asset: true } },
  shippingAddress: true,
  payment: true,
  hedgingOrder: true,
  tokenMint: { include: { transactions: true } },
  physicalItem: true,
  qrCodes: { orderBy: { createdAt: "desc" } },
  transactions: { orderBy: { createdAt: "asc" } },
  auditLogs: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type FullOrder = Prisma.OrderGetPayload<{ include: typeof fullOrderInclude }>;

export const listOrderInclude = {
  user: { include: { wallets: true } },
  items: { include: { asset: true } },
  payment: true,
  hedgingOrder: true,
  tokenMint: true,
  physicalItem: true,
  qrCodes: { where: { active: true }, take: 1 },
} satisfies Prisma.OrderInclude;

export type ListOrder = Prisma.OrderGetPayload<{ include: typeof listOrderInclude }>;
