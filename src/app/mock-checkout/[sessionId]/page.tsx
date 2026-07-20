/**
 * Page de paiement SIMULÉE (fournisseur mock, quand Stripe n'est pas
 * configuré). Permet de tester le succès ET l'échec de paiement. Clairement
 * identifiée comme une simulation.
 */
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MockPayButtons } from "@/components/mock-pay-buttons";
import { Alert, Card } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MockCheckoutPage({ params }: { params: { sessionId: string } }) {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/mock-checkout/${params.sessionId}`)}`);
  }

  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: params.sessionId },
    include: { order: { include: { items: { include: { asset: true } } } } },
  });
  if (!payment || payment.provider !== "mock") notFound();
  if (payment.order.userId !== session.userId) notFound();
  if (payment.status === "succeeded") {
    redirect(`/checkout/${payment.orderId}/confirmation`);
  }

  const item = payment.order.items[0];

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <Card className="p-8">
        <Alert tone="warning">
          Page de paiement <strong>simulée</strong> — Stripe n&apos;est pas configuré. Aucune
          donnée bancaire n&apos;est demandée ni traitée.
        </Alert>
        <h1 className="mt-6 text-xl font-semibold text-ink">Paiement de test</h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Commande</dt>
            <dd className="font-medium text-ink">{payment.order.publicId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Article</dt>
            <dd className="text-ink">
              {item ? `${item.quantity} × d${item.asset.ticker}` : "—"}
            </dd>
          </div>
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
            <dt className="text-ink">Montant</dt>
            <dd className="tabular text-ink">{formatMoney(payment.amount, payment.currency)}</dd>
          </div>
        </dl>
        <div className="mt-8">
          <MockPayButtons sessionId={params.sessionId} />
        </div>
      </Card>
    </div>
  );
}
