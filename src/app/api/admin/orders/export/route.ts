/**
 * GET /api/admin/orders/export?format=csv|json — exporte les commandes avec
 * les mêmes filtres que la liste /admin/orders (section 18).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { buildOrderWhere, buildOrderOrderBy, type OrderListParams } from "@/lib/order-filters";
import { toCsv, type CsvColumn } from "@/lib/csv";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Accès administrateur requis." }, { status: 403 });
  }

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries()) as OrderListParams & {
    format?: string;
  };
  const format = params.format === "json" ? "json" : "csv";

  const orders = await prisma.order.findMany({
    where: buildOrderWhere(params),
    orderBy: buildOrderOrderBy(params.sort),
    take: 5000,
    include: {
      user: { include: { wallets: true } },
      items: { include: { asset: true } },
      payment: true,
      hedgingOrder: true,
      tokenMint: true,
      physicalItem: true,
      shippingAddress: true,
    },
  });

  const rows = orders.map((o) => {
    const item = o.items[0];
    return {
      id: o.id,
      publicId: o.publicId,
      createdAt: o.createdAt.toISOString(),
      lastName: o.user.lastName ?? "",
      firstName: o.user.firstName ?? "",
      email: o.user.email,
      privyUserId: o.user.privyUserId ?? "",
      walletAddress: o.user.wallets[0]?.address ?? "",
      productId: item?.assetId ?? "",
      assetName: item?.asset.name ?? "",
      ticker: item?.asset.ticker ?? "",
      indexName: item?.asset.indexName ?? "",
      quantity: item?.quantity ?? 0,
      unitPrice: item?.lockedMarketPrice ?? 0,
      marginAmount: o.marginAmount,
      totalAmount: o.totalAmount,
      currency: o.currency,
      paymentStatus: o.payment?.status ?? "",
      stripeId: o.payment?.stripePaymentIntentId ?? o.payment?.stripeSessionId ?? "",
      hedgingStatus: o.hedgingOrder?.status ?? "",
      mintStatus: o.tokenMint?.status ?? "",
      txHash: o.tokenMint?.txHash ?? "",
      shippingStatus: o.physicalItem?.status ?? "",
      trackingNumber: o.physicalItem?.trackingNumber ?? "",
      orderStatus: o.status,
      shippingAddress: o.shippingAddress
        ? `${o.shippingAddress.line1}, ${o.shippingAddress.postalCode} ${o.shippingAddress.city}, ${o.shippingAddress.country}`
        : "",
    };
  });

  await audit({
    actor: { type: "admin", id: session.userId, email: session.email },
    action: "orders_exported",
    entityType: "Order",
    entityId: `export:${format}`,
    newValue: JSON.stringify({ count: rows.length, format }),
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="commandes.json"`,
      },
    });
  }

  type Row = (typeof rows)[number];
  const columns: CsvColumn<Row>[] = [
    { header: "ID interne", value: (r) => r.id },
    { header: "ID public", value: (r) => r.publicId },
    { header: "Date de création", value: (r) => r.createdAt },
    { header: "Nom", value: (r) => r.lastName },
    { header: "Prénom", value: (r) => r.firstName },
    { header: "E-mail", value: (r) => r.email },
    { header: "ID Privy", value: (r) => r.privyUserId },
    { header: "Wallet", value: (r) => r.walletAddress },
    { header: "ID produit", value: (r) => r.productId },
    { header: "Actif", value: (r) => r.assetName },
    { header: "Ticker", value: (r) => r.ticker },
    { header: "Indice", value: (r) => r.indexName },
    { header: "Quantité", value: (r) => r.quantity },
    { header: "Prix unitaire de référence", value: (r) => r.unitPrice },
    { header: "Marge", value: (r) => r.marginAmount },
    { header: "Total payé", value: (r) => r.totalAmount },
    { header: "Devise", value: (r) => r.currency },
    { header: "Statut paiement", value: (r) => r.paymentStatus },
    { header: "ID Stripe", value: (r) => r.stripeId },
    { header: "Statut couverture", value: (r) => r.hedgingStatus },
    { header: "Statut token", value: (r) => r.mintStatus },
    { header: "Hash transaction", value: (r) => r.txHash },
    { header: "Statut livraison", value: (r) => r.shippingStatus },
    { header: "N° de suivi", value: (r) => r.trackingNumber },
    { header: "Statut commande", value: (r) => r.orderStatus },
    { header: "Adresse de livraison", value: (r) => r.shippingAddress },
  ];

  return new NextResponse(toCsv(rows, columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commandes.csv"`,
    },
  });
}
