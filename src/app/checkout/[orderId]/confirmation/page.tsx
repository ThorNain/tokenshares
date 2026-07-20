/**
 * Page de retour après paiement. Le retour navigateur ne vaut PAS
 * confirmation : la page attend la confirmation du webhook (polling) et
 * affiche l'état réel de la commande.
 */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { PollRefresh } from "@/components/poll-refresh";
import { Alert, Card } from "@/components/ui";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/utils";
import { IconCheck, IconClock } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/${params.orderId}/confirmation`)}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: { include: { asset: true } }, payment: true, tokenMint: true },
  });
  if (!order || order.userId !== session.userId) notFound();

  const item = order.items[0];
  const paid = order.payment?.status === "succeeded" || order.payment?.status === "refunded";
  const failed = order.payment?.status === "failed";
  const waiting = !paid && !failed;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      {waiting ? <PollRefresh /> : null}
      <Card className="p-8 text-center">
        {paid ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-positive text-white">
              <IconCheck className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-ink">Commande confirmée</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Votre paiement de{" "}
              <strong className="text-ink">
                {formatMoney(order.totalAmount, order.currency)}
              </strong>{" "}
              pour {item?.quantity} token{(item?.quantity ?? 0) > 1 ? "s" : ""} de démonstration{" "}
              {item?.asset.name} a été confirmé par le prestataire de paiement.
            </p>
            <div className="mt-4 flex justify-center">
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              L&apos;émission du token sur le réseau de test et la préparation de votre objet
              souvenir se poursuivent automatiquement — suivez chaque étape depuis votre espace.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={`/dashboard/orders/${order.id}`}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Suivre ma commande
              </Link>
              <Link
                href="/dashboard/portfolio"
                className="rounded-full border border-ink/15 px-6 py-2.5 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Voir mon portefeuille
              </Link>
            </div>
          </>
        ) : failed ? (
          <>
            <h1 className="text-2xl font-semibold text-ink">Paiement non abouti</h1>
            <Alert tone="danger" className="mt-4 text-left">
              {order.payment?.failureMessage ?? "Le paiement a été refusé."}
            </Alert>
            <Link
              href={`/checkout/${order.id}`}
              className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Réessayer le paiement
            </Link>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <IconClock className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold text-ink">
              Confirmation en attente…
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Nous attendons la confirmation du prestataire de paiement (webhook). Cette page se
              met à jour automatiquement — un retour navigateur ne suffit jamais à valider une
              commande.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
