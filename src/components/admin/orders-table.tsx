"use client";

/**
 * Table des commandes admin (section 18) : toutes les colonnes exigées,
 * sélection multiple et actions groupées. Le tri/filtrage/pagination est
 * géré côté serveur (paramètres d'URL) ; ce composant gère la sélection et
 * les actions en lot.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, TableWrap, Table, TH, TD, Alert, Badge } from "@/components/ui";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  HedgingStatusBadge,
  MintStatusBadge,
  PhysicalStatusBadge,
} from "@/components/status-badge";
import { formatMoney, formatDateTime, shortHex } from "@/lib/utils";

export interface AdminOrderRow {
  id: string;
  publicId: string;
  createdAt: string;
  lastName: string;
  firstName: string;
  email: string;
  privyUserId: string;
  wallet: string;
  productId: string;
  assetName: string;
  ticker: string;
  indexName: string;
  quantity: number;
  unitPrice: number;
  margin: number;
  total: number;
  currency: string;
  paymentStatus: string | null;
  stripeId: string;
  hedgingStatus: string | null;
  mintStatus: string | null;
  txHash: string;
  shippingStatus: string | null;
  trackingNumber: string;
  status: string;
  needsReview: boolean;
}

const BULK_ACTIONS = [
  { action: "mark_shipped", label: "Marquer expédiées" },
  { action: "mark_delivered", label: "Marquer livrées" },
  { action: "toggle_review", label: "Marquer « à vérifier »", payload: { value: true } },
] as const;

export function AdminOrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const selectedCount = useMemo(
    () => rows.filter((r) => selected.has(r.id)).length,
    [rows, selected],
  );

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(action: string, payload?: Record<string, unknown>) {
    const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Confirmer l'action « ${BULK_ACTIONS.find((a) => a.action === action)?.label} » sur ${ids.length} commande(s) ?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setReport(null);
    let ok = 0;
    const failures: string[] = [];
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/orders/${id}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        if (res.ok) {
          ok += 1;
        } else {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          failures.push(`${id.slice(0, 8)}… : ${data.error ?? res.status}`);
        }
      } catch {
        failures.push(`${id.slice(0, 8)}… : erreur réseau`);
      }
    }
    setBusy(false);
    setReport(
      `${ok}/${ids.length} action(s) appliquée(s).` +
        (failures.length > 0 ? ` Échecs : ${failures.join(" · ")}` : ""),
    );
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-accent">
            {selectedCount} commande(s) sélectionnée(s)
          </span>
          {BULK_ACTIONS.map((a) => (
            <Button
              key={a.action}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => runBulk(a.action, "payload" in a ? a.payload : undefined)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
      {report ? <Alert tone="info">{report}</Alert> : null}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </TH>
              <TH>Commande</TH>
              <TH>Date</TH>
              <TH>Client</TH>
              <TH>E-mail</TH>
              <TH>ID Privy</TH>
              <TH>Wallet</TH>
              <TH>ID produit</TH>
              <TH>Actif</TH>
              <TH>Indice</TH>
              <TH className="text-right">Qté</TH>
              <TH className="text-right">Prix unitaire</TH>
              <TH className="text-right">Marge</TH>
              <TH className="text-right">Total</TH>
              <TH>Paiement</TH>
              <TH>ID Stripe</TH>
              <TH>Couverture</TH>
              <TH>Token</TH>
              <TH>Hash tx</TH>
              <TH>Livraison</TH>
              <TH>Suivi</TH>
              <TH>Statut</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-cream/60">
                <TD>
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner ${r.publicId}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                  />
                </TD>
                <TD>
                  <Link
                    href={`/admin/orders/${r.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {r.publicId}
                  </Link>
                  <div className="font-mono text-[10px] text-ink-muted">{r.id}</div>
                  {r.needsReview ? <Badge tone="warning">À vérifier</Badge> : null}
                </TD>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</TD>
                <TD>
                  {r.lastName || r.firstName ? `${r.lastName} ${r.firstName}` : "—"}
                </TD>
                <TD className="text-xs">{r.email}</TD>
                <TD className="font-mono text-[10px]">{r.privyUserId || "—"}</TD>
                <TD className="font-mono text-[10px]">{shortHex(r.wallet)}</TD>
                <TD className="font-mono text-[10px]">{r.productId}</TD>
                <TD>
                  <div className="font-medium">{r.assetName}</div>
                  <div className="text-xs text-ink-muted">{r.ticker}</div>
                </TD>
                <TD className="text-xs">{r.indexName}</TD>
                <TD className="text-right tabular">{r.quantity}</TD>
                <TD className="text-right tabular text-xs">
                  {formatMoney(r.unitPrice, r.currency)}
                </TD>
                <TD className="text-right tabular text-xs">{formatMoney(r.margin, r.currency)}</TD>
                <TD className="text-right tabular font-medium">
                  {formatMoney(r.total, r.currency)}
                </TD>
                <TD>
                  <PaymentStatusBadge status={r.paymentStatus} />
                </TD>
                <TD className="font-mono text-[10px]">{r.stripeId ? shortHex(r.stripeId, 8) : "—"}</TD>
                <TD>
                  <HedgingStatusBadge status={r.hedgingStatus} />
                </TD>
                <TD>
                  <MintStatusBadge status={r.mintStatus} />
                </TD>
                <TD className="font-mono text-[10px]">{r.txHash ? shortHex(r.txHash) : "—"}</TD>
                <TD>
                  <PhysicalStatusBadge status={r.shippingStatus} />
                </TD>
                <TD className="font-mono text-xs">{r.trackingNumber || "—"}</TD>
                <TD>
                  <OrderStatusBadge status={r.status} />
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          Aucune commande ne correspond aux filtres.
        </p>
      ) : null}
    </div>
  );
}
