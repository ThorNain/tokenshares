/**
 * Ordres de vente (rachat + destruction du token). L'opérateur y confirme le
 * prix réellement obtenu chez le courtier — ce qui déclenche la destruction
 * (burn) du token — ou relance une destruction échouée.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TableWrap, Table, TH, TD, Badge, Alert } from "@/components/ui";
import { PriceActionButton } from "@/components/admin/price-action-button";
import { AdminSellActionButton } from "@/components/admin/sell-action-button";
import { formatMoney, formatDateTime, shortHex, explorerTxUrl } from "@/lib/utils";
import { isRealChain } from "@/lib/providers/blockchain";
import { asSellStatus, SELL_STATUS_LABELS, SELL_STATUS_TONES } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function AdminSellOrdersPage() {
  const sellOrders = await prisma.sellOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true, asset: true },
  });
  const realChain = isRealChain();
  const pendingCount = sellOrders.filter((s) => s.status === "pending_broker").length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Ventes / rachats{" "}
          <span className="text-sm font-normal text-ink-muted">({sellOrders.length})</span>
        </h2>
        <p className="text-sm text-ink-muted">
          Confirmez le prix réel obtenu chez le courtier pour déclencher la destruction du token.
        </p>
      </div>

      {pendingCount > 0 ? (
        <Alert tone="warning">
          {pendingCount} vente(s) en attente d&apos;exécution chez le courtier — vendez l&apos;action
          réelle puis saisissez le prix obtenu.
        </Alert>
      ) : null}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Réf. vente</TH>
              <TH>Date</TH>
              <TH>Client</TH>
              <TH>Actif</TH>
              <TH className="text-right">Qté</TH>
              <TH className="text-right">Prix indicatif</TH>
              <TH className="text-right">Prix exécuté</TH>
              <TH className="text-right">Produit</TH>
              <TH>Statut</TH>
              <TH>Burn (tx)</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {sellOrders.map((s) => {
              const status = asSellStatus(s.status);
              return (
                <tr key={s.id} className="hover:bg-cream/60">
                  <TD className="font-mono text-xs">{s.publicId}</TD>
                  <TD className="whitespace-nowrap text-xs">{formatDateTime(s.createdAt)}</TD>
                  <TD className="text-xs">{s.user.email}</TD>
                  <TD>
                    <span className="font-medium">{s.asset.name}</span>{" "}
                    <span className="text-xs text-ink-muted">({s.ticker})</span>
                  </TD>
                  <TD className="text-right tabular">{s.quantity}</TD>
                  <TD className="text-right tabular">{formatMoney(s.referencePrice, s.currency)}</TD>
                  <TD className="text-right tabular">
                    {s.executedPrice != null ? formatMoney(s.executedPrice, s.currency) : "—"}
                  </TD>
                  <TD className="text-right tabular">
                    {s.proceedsAmount != null ? formatMoney(s.proceedsAmount, s.currency) : "—"}
                  </TD>
                  <TD>
                    <Badge tone={SELL_STATUS_TONES[status]}>● {SELL_STATUS_LABELS[status]}</Badge>
                    {s.lastError ? (
                      <div className="mt-1 max-w-[200px] text-xs text-negative">{s.lastError}</div>
                    ) : null}
                  </TD>
                  <TD className="font-mono text-[10px]">
                    {s.burnTxHash ? (
                      realChain ? (
                        <a
                          href={explorerTxUrl(s.burnTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {shortHex(s.burnTxHash, 8)}
                        </a>
                      ) : (
                        shortHex(s.burnTxHash, 8)
                      )
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1.5">
                      {s.status === "pending_broker" ? (
                        <>
                          <PriceActionButton
                            endpoint={`/api/admin/sell-orders/${s.id}/actions`}
                            action="confirm_sell_price"
                            label="Confirmer le prix de vente"
                            title="Prix réel de vente de l'action"
                            helpText="Saisissez le prix unitaire réellement obtenu à la vente. Le token sera ensuite détruit (burn) automatiquement."
                            currency={s.currency}
                          />
                          <AdminSellActionButton sellOrderId={s.id} action="cancel" label="Annuler" />
                        </>
                      ) : null}
                      {s.status === "failed" ? (
                        <AdminSellActionButton
                          sellOrderId={s.id}
                          action="retry_burn"
                          label="Relancer la destruction"
                        />
                      ) : null}
                    </div>
                  </TD>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>
      {sellOrders.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Aucun ordre de vente.</p>
      ) : null}

      <p className="text-xs text-ink-muted">
        <Link href="/admin" className="text-accent hover:underline">
          ← Retour au tableau de bord
        </Link>
      </p>
    </div>
  );
}
