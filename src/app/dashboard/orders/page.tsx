/** Vue commandes du client : liste avec statuts et accès au suivi détaillé. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { TableWrap, Table, TH, TD, Alert } from "@/components/ui";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  MintStatusBadge,
  PhysicalStatusBadge,
} from "@/components/status-badge";
import { formatMoney, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { asset: true } },
      payment: true,
      tokenMint: true,
      physicalItem: true,
    },
  });

  if (orders.length === 0) {
    return (
      <Alert tone="info">
        Aucune commande pour l&apos;instant.{" "}
        <Link href="/assets" className="font-medium underline">
          Découvrir les actifs
        </Link>
      </Alert>
    );
  }

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <TH>Commande</TH>
            <TH>Actif</TH>
            <TH className="text-right">Qté</TH>
            <TH className="text-right">Montant payé</TH>
            <TH>Paiement</TH>
            <TH>Token</TH>
            <TH>Livraison</TH>
            <TH>Statut</TH>
            <TH />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const item = order.items[0];
            return (
              <tr key={order.id} className="hover:bg-cream/60">
                <TD>
                  <div className="font-medium">{order.publicId}</div>
                  <div className="text-xs text-ink-muted">{formatDateTime(order.createdAt)}</div>
                </TD>
                <TD>
                  {item ? (
                    <>
                      <div className="font-medium">{item.asset.name}</div>
                      <div className="text-xs text-ink-muted">d{item.asset.ticker}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-right tabular">{item?.quantity ?? 0}</TD>
                <TD className="text-right tabular">
                  {formatMoney(order.totalAmount, order.currency)}
                </TD>
                <TD>
                  <PaymentStatusBadge status={order.payment?.status} />
                </TD>
                <TD>
                  <MintStatusBadge status={order.tokenMint?.status} />
                </TD>
                <TD>
                  <PhysicalStatusBadge status={order.physicalItem?.status} />
                </TD>
                <TD>
                  <OrderStatusBadge status={order.status} />
                </TD>
                <TD>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Suivi →
                  </Link>
                </TD>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}
