/**
 * Checkout : récapitulatif (marge explicite), adresse de livraison puis
 * paiement. Le paiement n'est jamais validé ici — uniquement par webhook.
 */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AddressForm } from "@/components/address-form";
import { PayButton } from "@/components/pay-button";
import { GiftToggle } from "@/components/gift-toggle";
import { Totem } from "@/components/totem";
import { Alert, Card } from "@/components/ui";
import { formatMoney, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { cancelled?: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/${params.orderId}`)}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: { include: { asset: true } },
      shippingAddress: true,
      payment: true,
    },
  });
  // Protection : jamais afficher la commande d'un autre utilisateur.
  if (!order || order.userId !== session.userId) notFound();
  if (order.payment?.status === "succeeded") {
    redirect(`/checkout/${order.id}/confirmation`);
  }
  if (!["created", "pending_payment"].includes(order.status)) {
    redirect(`/dashboard/orders/${order.id}`);
  }

  const item = order.items[0];
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Finaliser la commande <span className="text-ink-muted">{order.publicId}</span>
      </h1>

      {searchParams.cancelled ? (
        <Alert tone="warning" className="mt-4">
          Paiement annulé. Vous pouvez réessayer quand vous le souhaitez.
        </Alert>
      ) : null}
      {order.payment?.status === "failed" ? (
        <Alert tone="danger" className="mt-4">
          Le paiement précédent a échoué
          {order.payment.failureMessage ? ` : ${order.payment.failureMessage}` : "."} Vous pouvez
          réessayer.
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,380px]">
        <div className="space-y-6">
          <GiftToggle orderId={order.id} initial={order.isGift} />

          <Card className="p-6">
            <h2 className="font-semibold text-ink">Adresse de livraison</h2>
            {order.isGift ? (
              <Alert tone="info" className="mt-3">
                Cadeau : c&apos;est le destinataire qui renseignera son adresse de livraison au
                moment de réclamer le token. Vous pouvez payer sans saisir d&apos;adresse.
              </Alert>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink-muted">
                  Votre objet de collection
                  {item.asset.totemName ? ` — ${item.asset.totemName} —` : " (avec QR code)"} sera
                  expédié à cette adresse. Modifiable jusqu&apos;à l&apos;expédition.
                </p>
                <div className="mt-6">
                  <AddressForm orderId={order.id} initial={order.shippingAddress} />
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="font-semibold text-ink">Récapitulatif</h2>
            <div className="mt-4 flex items-center gap-3">
              <Totem image={item.asset.totemImage} emoji={item.asset.totemEmoji} initials={item.asset.initials} name={item.asset.totemName} size="lg" />
              <div>
                <p className="text-sm font-medium text-ink">{item.asset.name}</p>
                <p className="text-xs text-ink-muted">
                  {item.asset.ticker} · {item.quantity} token{item.quantity > 1 ? "s" : ""} de
                  démonstration
                </p>
                {item.asset.totemName ? (
                  <p className="mt-0.5 text-xs text-ink-muted">+ {item.asset.totemName}</p>
                ) : null}
              </div>
            </div>
            <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Prix indicatif figé ({formatMoney(item.lockedMarketPrice, item.currency)} ×{" "}
                  {item.quantity})
                </dt>
                <dd className="tabular text-ink">
                  {formatMoney(order.subtotalAmount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">
                  Marge commerciale ({formatPercent(order.marginRate)})
                </dt>
                <dd className="tabular text-ink">
                  {formatMoney(order.marginAmount, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
                <dt className="text-ink">Total</dt>
                <dd className="tabular text-ink">
                  {formatMoney(order.totalAmount, order.currency)}
                </dd>
              </div>
            </dl>
          </Card>

          <PayButton orderId={order.id} disabled={!order.isGift && !order.shippingAddress} />

          <p className="text-xs leading-relaxed text-ink-muted">
            Le prix affiché comprend le prix indicatif de l&apos;actif simulé ainsi qu&apos;une
            marge commerciale de {formatPercent(order.marginRate)}. Dans cette version de
            démonstration, aucune action réelle n&apos;est achetée et le token émis sur la
            blockchain de test ne constitue ni une action, ni un instrument financier, ni un droit
            de propriété sur une entreprise cotée.
          </p>
        </div>
      </div>
    </div>
  );
}
