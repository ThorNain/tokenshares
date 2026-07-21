/**
 * Vue portefeuille : valeur indicative totale, positions, prix d'achat,
 * variation simulée, adresse du wallet et lien explorateur (section 8).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPortfolio, getSellableQuantity } from "@/lib/portfolio";
import { isRealChain } from "@/lib/providers/blockchain";
import { Card, Badge, TableWrap, Table, TH, TD, Alert } from "@/components/ui";
import { SellButton } from "@/components/sell-button";
import { formatMoney, formatPercent, explorerAddressUrl, shortHex, CHAIN_NAME } from "@/lib/utils";
import { IconExternal, IconWallet } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [portfolio, wallet] = await Promise.all([
    getPortfolio(session.userId),
    prisma.wallet.findFirst({ where: { userId: session.userId } }),
  ]);
  const realChain = isRealChain();
  // Quantité réellement vendable par actif (détenu − déjà engagé en vente).
  const sellableByAsset = new Map<string, number>(
    await Promise.all(
      portfolio.positions.map(
        async (p) =>
          [p.assetId, await getSellableQuantity(session.userId, p.assetId)] as [string, number],
      ),
    ),
  );

  return (
    <div className="space-y-8">
      {/* Totaux + wallet */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {portfolio.totals.length === 0 ? (
          <Card className="p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Valeur indicative totale
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">—</p>
          </Card>
        ) : (
          portfolio.totals.map((t) => (
            <Card key={t.currency} className="p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Valeur indicative totale
              </p>
              <p className="mt-2 text-2xl font-semibold tabular text-ink">
                {formatMoney(t.value, t.currency)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Investi : {formatMoney(t.invested, t.currency)}{" "}
                <Badge tone={t.value >= t.invested ? "success" : "danger"} className="ml-1">
                  {t.invested > 0 ? formatPercent(t.value / t.invested - 1, 2) : "—"}
                </Badge>
              </p>
            </Card>
          ))
        )}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            <IconWallet className="h-4 w-4" /> Wallet ({CHAIN_NAME})
          </p>
          {wallet ? (
            <>
              <p className="mt-2 break-all font-mono text-sm text-ink">{wallet.address}</p>
              {realChain ? (
                <a
                  href={explorerAddressUrl(wallet.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Voir sur l&apos;explorateur <IconExternal className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-2 text-xs text-ink-muted">
                  Blockchain simulée : adresse {shortHex(wallet.address)} (
                  {wallet.provider === "privy" ? "Privy" : "démo"}).
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Aucun wallet enregistré.</p>
          )}
        </Card>
      </div>

      {/* Positions */}
      {portfolio.positions.length === 0 ? (
        <Alert tone="info">
          Vous ne détenez pas encore de token. Parcourez le{" "}
          <a href="/assets" className="font-medium underline">
            catalogue d&apos;actifs
          </a>{" "}
          pour passer votre première commande de démonstration.
        </Alert>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <TH>Actif</TH>
                <TH className="text-right">Tokens</TH>
                <TH className="text-right">Prix d&apos;achat moyen</TH>
                <TH className="text-right">Prix indicatif actuel</TH>
                <TH className="text-right">Valeur indicative</TH>
                <TH className="text-right">Variation</TH>
                <TH className="text-right">Action</TH>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.map((p) => (
                <tr key={p.assetId} className="hover:bg-cream/60">
                  <TD>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-ink-muted">
                      d{p.ticker} · token n°{p.tokenId}
                    </div>
                  </TD>
                  <TD className="text-right tabular">{p.quantity}</TD>
                  <TD className="text-right tabular">
                    {formatMoney(p.avgPurchasePrice, p.currency)}
                  </TD>
                  <TD className="text-right tabular">{formatMoney(p.currentPrice, p.currency)}</TD>
                  <TD className="text-right tabular font-medium">
                    {formatMoney(p.currentValue, p.currency)}
                  </TD>
                  <TD className="text-right">
                    <Badge tone={p.changeSincePurchase >= 0 ? "success" : "danger"}>
                      {p.changeSincePurchase >= 0 ? "▲" : "▼"}{" "}
                      {formatPercent(Math.abs(p.changeSincePurchase), 2)}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    <SellButton
                      assetId={p.assetId}
                      ticker={p.ticker}
                      sellableQuantity={sellableByAsset.get(p.assetId) ?? 0}
                      currentPrice={p.currentPrice}
                      currency={p.currency}
                    />
                  </TD>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <p className="text-xs leading-relaxed text-ink-muted">
        Les prix et variations affichés sont simulés. Les tokens détenus sont des tokens de
        démonstration émis sur un réseau de test : ils ne représentent ni des actions ni des
        instruments financiers.
      </p>
    </div>
  );
}
