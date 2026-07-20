/** Vue expéditions : commandes à expédier / expédiées, actions rapides. */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TableWrap, Table, TH, TD } from "@/components/ui";
import { PhysicalStatusBadge, OrderStatusBadge } from "@/components/status-badge";
import { AdminActionButton } from "@/components/admin/action-button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["shipping_pending", "shipped", "delivered"] } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      user: true,
      items: { include: { asset: true } },
      shippingAddress: true,
      physicalItem: true,
    },
  });

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-ink">
        Expéditions <span className="text-sm font-normal text-ink-muted">({orders.length})</span>
      </h2>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Commande</TH>
              <TH>Client</TH>
              <TH>Actif</TH>
              <TH>Adresse</TH>
              <TH>Objet</TH>
              <TH>Transporteur / suivi</TH>
              <TH>Expédiée le</TH>
              <TH>Statut</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-cream/60">
                <TD>
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-accent hover:underline">
                    {o.publicId}
                  </Link>
                  <div className="mt-0.5">
                    <OrderStatusBadge status={o.status} />
                  </div>
                </TD>
                <TD className="text-xs">
                  {o.user.lastName ?? ""} {o.user.firstName ?? ""}
                  <div className="text-ink-muted">{o.user.email}</div>
                </TD>
                <TD className="text-xs">{o.items[0]?.asset.ticker ?? "—"}</TD>
                <TD className="max-w-[220px] text-xs">
                  {o.shippingAddress
                    ? `${o.shippingAddress.line1}, ${o.shippingAddress.postalCode} ${o.shippingAddress.city}, ${o.shippingAddress.country}`
                    : "—"}
                </TD>
                <TD>
                  <PhysicalStatusBadge status={o.physicalItem?.status} />
                </TD>
                <TD className="text-xs">
                  {o.physicalItem?.carrier ?? "—"}
                  {o.physicalItem?.trackingNumber ? (
                    <div className="font-mono">{o.physicalItem.trackingNumber}</div>
                  ) : null}
                </TD>
                <TD className="whitespace-nowrap text-xs">
                  {formatDateTime(o.physicalItem?.shippedAt)}
                </TD>
                <TD>
                  <OrderStatusBadge status={o.status} />
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1.5">
                    {o.status === "shipping_pending" ? (
                      <AdminActionButton
                        orderId={o.id}
                        action="mark_shipped"
                        label="Expédier"
                        confirmText="Confirmer l'expédition ? Numéro de suivi généré automatiquement si non renseigné."
                        fields={[
                          { name: "carrier", label: "Transporteur" },
                          { name: "trackingNumber", label: "N° de suivi" },
                        ]}
                      />
                    ) : null}
                    {o.status === "shipped" ? (
                      <AdminActionButton
                        orderId={o.id}
                        action="mark_delivered"
                        label="Livrée"
                        confirmText="Confirmer la livraison ?"
                      />
                    ) : null}
                  </div>
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Aucune commande à expédier.</p>
      ) : null}
    </div>
  );
}
