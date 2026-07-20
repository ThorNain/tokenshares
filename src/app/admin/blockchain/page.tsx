/**
 * Vue blockchain (section 24) : réseau, contrat, statistiques d'émission et
 * tableau complet des opérations on-chain.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBlockchainProvider } from "@/lib/providers/blockchain";
import { Card, TableWrap, Table, TH, TD } from "@/components/ui";
import { TxStatusBadge } from "@/components/status-badge";
import { formatDateTime, shortHex } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBlockchainPage() {
  const chain = getBlockchainProvider();

  const [txs, minted, holders, pendingCount, failedCount, feeSum, lastBlocks] = await Promise.all([
    prisma.blockchainTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: { include: { user: true, items: { include: { asset: true } } } },
      },
    }),
    prisma.tokenMint.aggregate({ where: { status: "transfer_confirmed" }, _sum: { quantity: true } }),
    prisma.tokenMint.findMany({
      where: { status: "transfer_confirmed" },
      select: { toAddress: true },
      distinct: ["toAddress"],
    }),
    prisma.blockchainTransaction.count({ where: { status: { in: ["pending", "submitted"] } } }),
    prisma.blockchainTransaction.count({ where: { status: "failed" } }),
    prisma.blockchainTransaction.findMany({
      where: { feeWei: { not: null } },
      select: { feeWei: true },
    }),
    prisma.blockchainTransaction.findMany({
      where: { blockNumber: { not: null } },
      orderBy: { blockNumber: "desc" },
      take: 5,
      select: { blockNumber: true },
    }),
  ]);

  const totalFees = feeSum.reduce((acc, t) => acc + BigInt(t.feeWei ?? "0"), 0n);
  const totalTx = await prisma.blockchainTransaction.count();

  const stats = [
    { label: "Réseau", value: chain.network },
    { label: "Contrat ERC-1155", value: shortHex(chain.contractAddress, 8) },
    { label: "Tokens créés", value: String(minted._sum.quantity ?? 0) },
    { label: "Détenteurs", value: String(holders.length) },
    { label: "Transactions", value: String(totalTx) },
    { label: "En attente", value: String(pendingCount) },
    { label: "Échouées", value: String(failedCount) },
    { label: "Coût réseau total (wei)", value: totalFees.toString() },
    {
      label: "Derniers blocs observés",
      value: lastBlocks.map((b) => b.blockNumber).join(", ") || "—",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Blockchain & tokens</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{s.label}</p>
            <p className="mt-1 break-all text-sm font-semibold text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>ID interne</TH>
              <TH>Commande</TH>
              <TH>Client</TH>
              <TH>Wallet destination</TH>
              <TH>Actif</TH>
              <TH className="text-right">Qté</TH>
              <TH>Type</TH>
              <TH>Hash</TH>
              <TH className="text-right">Bloc</TH>
              <TH>Statut</TH>
              <TH className="text-right">Conf.</TH>
              <TH className="text-right">Frais (wei)</TH>
              <TH>Créée</TH>
              <TH>Confirmée</TH>
              <TH>Erreur</TH>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="hover:bg-cream/60">
                <TD className="font-mono text-[10px]">{tx.id.slice(0, 10)}…</TD>
                <TD>
                  {tx.order ? (
                    <Link href={`/admin/orders/${tx.order.id}`} className="text-accent hover:underline">
                      {tx.order.publicId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-xs">{tx.order?.user.email ?? "—"}</TD>
                <TD className="font-mono text-[10px]">{shortHex(tx.toAddress, 8)}</TD>
                <TD className="text-xs">{tx.order?.items[0]?.asset.ticker ?? tx.tokenId ?? "—"}</TD>
                <TD className="text-right tabular">{tx.quantity ?? "—"}</TD>
                <TD className="text-xs">{tx.type}</TD>
                <TD className="font-mono text-[10px]">{tx.txHash ? shortHex(tx.txHash, 8) : "—"}</TD>
                <TD className="text-right tabular text-xs">{tx.blockNumber ?? "—"}</TD>
                <TD>
                  <TxStatusBadge status={tx.status} />
                </TD>
                <TD className="text-right tabular text-xs">{tx.confirmations}</TD>
                <TD className="text-right tabular text-xs">{tx.feeWei ?? "—"}</TD>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(tx.createdAt)}</TD>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(tx.confirmedAt)}</TD>
                <TD className="max-w-[200px] truncate text-xs text-negative" title={tx.error ?? ""}>
                  {tx.error ?? "—"}
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
