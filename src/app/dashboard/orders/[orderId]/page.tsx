/**
 * Suivi détaillé d'une commande côté client : timeline 12 étapes, QR code
 * (affichage, téléchargement PNG/SVG, impression), transaction blockchain,
 * adresse modifiable avant expédition.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fullOrderInclude } from "@/lib/order-includes";
import { buildOrderTimeline } from "@/lib/timeline";
import { qrPngDataUrl } from "@/lib/qr";
import { isRealChain } from "@/lib/providers/blockchain";
import { OrderTimeline } from "@/components/order-timeline";
import { AddressForm } from "@/components/address-form";
import { Alert, Card } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatMoney, formatPercent, formatDateTime, shortHex, explorerTxUrl } from "@/lib/utils";
import { IconDownload, IconExternal } from "@/components/icons";
import { Totem } from "@/components/totem";

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: fullOrderInclude,
  });
  // Jamais la commande d'un autre utilisateur.
  if (!order || (order.userId !== session.userId && session.role !== "admin")) notFound();

  const item = order.items[0];
  const timeline = buildOrderTimeline(order);
  const activeQr = order.qrCodes.find((q) => q.active) ?? null;
  const qrDataUrl = activeQr ? await qrPngDataUrl(activeQr.publicToken) : null;
  const addressEditable =
    !["shipped", "delivered"].includes(order.physicalItem?.status ?? "") &&
    !["refunded", "cancelled"].includes(order.status);
  const realChain = isRealChain();
  const mint = order.tokenMint;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/orders" className="text-sm text-ink-muted hover:text-ink">
            ← Mes commandes
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            Commande {order.publicId}
            <span className="ml-3 align-middle">
              <OrderStatusBadge status={order.status} />
            </span>
          </h2>
        </div>
        <p className="text-sm text-ink-muted">{formatDateTime(order.createdAt)}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
        <div className="space-y-8">
          <Card className="p-6">
            <h3 className="font-semibold text-ink">Progression</h3>
            <div className="mt-5">
              <OrderTimeline steps={timeline} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-ink">Adresse de livraison</h3>
            {addressEditable ? (
              <div className="mt-4">
                <AddressForm orderId={order.id} initial={order.shippingAddress} />
              </div>
            ) : order.shippingAddress ? (
              <div className="mt-3 text-sm text-ink-soft">
                <p>
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 ? <p>{order.shippingAddress.line2}</p> : null}
                <p>
                  {order.shippingAddress.postalCode} {order.shippingAddress.city},{" "}
                  {order.shippingAddress.country}
                </p>
                <Alert tone="info" className="mt-3">
                  Commande expédiée : l&apos;adresse n&apos;est plus modifiable.
                </Alert>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">Aucune adresse enregistrée.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-ink">Récapitulatif</h3>
            {item?.asset.totemName ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-cream p-3">
                <Totem image={item.asset.totemImage} emoji={item.asset.totemEmoji} initials={item.asset.initials} name={item.asset.totemName} size="lg" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Objet physique</p>
                  <p className="text-sm font-medium text-ink">{item.asset.totemName}</p>
                </div>
              </div>
            ) : null}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Actif</dt>
                <dd className="text-ink">{item ? `${item.asset.name} (d${item.asset.ticker})` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Quantité</dt>
                <dd className="tabular text-ink">{item?.quantity ?? 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Marge ({formatPercent(order.marginRate)})</dt>
                <dd className="tabular text-ink">{formatMoney(order.marginAmount, order.currency)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt className="text-ink">Montant payé</dt>
                <dd className="tabular text-ink">{formatMoney(order.totalAmount, order.currency)}</dd>
              </div>
            </dl>
            {order.physicalItem?.trackingNumber ? (
              <p className="mt-4 rounded-lg bg-cream px-3 py-2 text-xs text-ink-soft">
                Suivi colis : {order.physicalItem.carrier} —{" "}
                <span className="font-mono">{order.physicalItem.trackingNumber}</span>
              </p>
            ) : null}
          </Card>

          {mint?.txHash ? (
            <Card className="p-6">
              <h3 className="font-semibold text-ink">Transaction blockchain</h3>
              <p className="mt-2 break-all font-mono text-xs text-ink-soft">{mint.txHash}</p>
              <p className="mt-2 text-xs text-ink-muted">
                Réseau : {mint.network} · Bloc {mint.blockNumber ?? "—"} · {mint.confirmations}{" "}
                confirmation{mint.confirmations > 1 ? "s" : ""}
              </p>
              {realChain ? (
                <a
                  href={explorerTxUrl(mint.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Voir sur l&apos;explorateur <IconExternal className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-3 text-xs text-ink-muted">
                  Transaction simulée ({shortHex(mint.txHash)}) — configurez BLOCKCHAIN_PROVIDER=viem
                  pour un vrai testnet.
                </p>
              )}
            </Card>
          ) : null}

          <Card className="p-6">
            <h3 className="font-semibold text-ink">QR code de l&apos;objet</h3>
            {qrDataUrl && activeQr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code de la commande ${order.publicId}`}
                  className="mx-auto mt-4 h-44 w-44 rounded-xl border border-ink/10"
                />
                <p className="mt-3 text-center text-xs text-ink-muted">
                  Pointe vers /claim/… — aucune donnée sensible embarquée.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                  <a
                    href={`/api/qr/${order.id}?format=png`}
                    className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 font-medium text-ink hover:bg-ink/5"
                  >
                    <IconDownload className="h-3.5 w-3.5" /> PNG
                  </a>
                  <a
                    href={`/api/qr/${order.id}?format=svg`}
                    className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 font-medium text-ink hover:bg-ink/5"
                  >
                    <IconDownload className="h-3.5 w-3.5" /> SVG
                  </a>
                  <Link
                    href={`/claim/${activeQr.publicToken}`}
                    className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 font-medium text-ink hover:bg-ink/5"
                  >
                    Ouvrir la page publique
                  </Link>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                Le QR code sera généré après l&apos;émission du token.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
