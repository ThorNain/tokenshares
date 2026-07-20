/**
 * Vue des réserves (section 23) : rapprochement entre quantités vendues,
 * tokens émis et couvertures simulées. coverageRatio attendu : 100 %.
 */
import { getReservesReport } from "@/lib/reserves";
import { TableWrap, Table, TH, TD, Badge, Alert } from "@/components/ui";
import { formatMoney, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReservesPage() {
  const report = await getReservesReport();

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-ink">Réserves & rapprochement</h2>
        <p className="text-sm text-ink-muted">
          coverageRatio = quantité couverte (simulée) / quantité tokenisée — attendu : 100 %.
        </p>
      </div>

      {report.globalAlerts.map((alert, i) => (
        <Alert key={i} tone="warning">
          ⚠ {alert}
        </Alert>
      ))}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Actif</TH>
              <TH>ID produit</TH>
              <TH>Indice</TH>
              <TH className="text-right">Qté vendue</TH>
              <TH className="text-right">Tokens émis</TH>
              <TH className="text-right">On-chain</TH>
              <TH className="text-right">Actions couvertes</TH>
              <TH className="text-right">Valeur commandes</TH>
              <TH className="text-right">Valeur couvertures</TH>
              <TH className="text-right">Écart</TH>
              <TH className="text-right">Ratio</TH>
              <TH>Rapprochement</TH>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.assetId} className="hover:bg-cream/60">
                <TD>
                  <span className="font-medium">{r.name}</span>{" "}
                  <span className="text-xs text-ink-muted">({r.ticker})</span>
                </TD>
                <TD className="font-mono text-[10px]">{r.assetId}</TD>
                <TD className="text-xs">{r.indexName}</TD>
                <TD className="text-right tabular">{r.soldQuantity}</TD>
                <TD className="text-right tabular">{r.tokenizedQuantity}</TD>
                <TD className="text-right tabular">{r.onChainQuantity}</TD>
                <TD className="text-right tabular">{r.coveredQuantity}</TD>
                <TD className="text-right tabular">{formatMoney(r.ordersValue, r.currency)}</TD>
                <TD className="text-right tabular">{formatMoney(r.hedgesValue, r.currency)}</TD>
                <TD className="text-right tabular">{r.delta}</TD>
                <TD className="text-right tabular font-medium">
                  {r.coverageRatio === null ? "—" : formatPercent(r.coverageRatio)}
                </TD>
                <TD>
                  {r.status === "ok" ? (
                    <Badge tone="success">● Conforme</Badge>
                  ) : (
                    <div className="space-y-1">
                      <Badge tone="danger">● Alerte</Badge>
                      <ul className="list-disc pl-4 text-xs text-negative">
                        {r.alerts.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>

      <p className="text-xs text-ink-muted">
        Les achats d&apos;actions sont simulés dans ce prototype ; la logique de rapprochement
        (base ↔ couverture ↔ blockchain) est en revanche pleinement fonctionnelle.
      </p>
    </div>
  );
}
