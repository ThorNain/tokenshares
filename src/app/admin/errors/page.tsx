/**
 * Gestion des erreurs (section 26) : toutes les erreurs par service, avec
 * gravité, tentatives, résolution.
 */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TableWrap, Table, TH, TD, Select, Button } from "@/components/ui";
import { SeverityBadge } from "@/components/status-badge";
import { ErrorResolveButton } from "@/components/admin/error-resolve-button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SERVICES = [
  "privy",
  "stripe",
  "database",
  "market-data",
  "broker",
  "mint",
  "blockchain",
  "qrcode",
  "shipping",
  "auth",
  "app",
];

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: { service?: string; severity?: string; resolved?: string };
}) {
  const errors = await prisma.errorLog.findMany({
    where: {
      ...(searchParams.service ? { service: searchParams.service } : {}),
      ...(searchParams.severity ? { severity: searchParams.severity } : {}),
      ...(searchParams.resolved === "yes"
        ? { resolved: true }
        : searchParams.resolved === "no"
          ? { resolved: false }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { order: { select: { id: true, publicId: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Erreurs <span className="text-sm font-normal text-ink-muted">({errors.length})</span>
        </h2>
        <form method="GET" className="flex flex-wrap gap-2">
          <Select name="service" defaultValue={searchParams.service ?? ""} className="w-44" aria-label="Service">
            <option value="">Service : tous</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select name="severity" defaultValue={searchParams.severity ?? ""} className="w-40" aria-label="Gravité">
            <option value="">Gravité : toutes</option>
            <option value="info">Information</option>
            <option value="warning">Avertissement</option>
            <option value="error">Erreur</option>
            <option value="critical">Critique</option>
          </Select>
          <Select name="resolved" defaultValue={searchParams.resolved ?? ""} className="w-44" aria-label="Résolution">
            <option value="">Résolution : toutes</option>
            <option value="no">Non résolues</option>
            <option value="yes">Résolues</option>
          </Select>
          <Button type="submit" variant="outline">Filtrer</Button>
        </form>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Date</TH>
              <TH>Gravité</TH>
              <TH>Service</TH>
              <TH>Type</TH>
              <TH>Message</TH>
              <TH>Détail technique</TH>
              <TH>Commande</TH>
              <TH className="text-right">Tentatives</TH>
              <TH>Dernière tentative</TH>
              <TH>Résolution</TH>
            </tr>
          </thead>
          <tbody>
            {errors.map((e) => (
              <tr key={e.id} className="hover:bg-cream/60">
                <TD className="whitespace-nowrap text-xs">{formatDateTime(e.createdAt)}</TD>
                <TD>
                  <SeverityBadge severity={e.severity} />
                </TD>
                <TD className="text-xs">{e.service}</TD>
                <TD className="font-mono text-xs">{e.type}</TD>
                <TD className="max-w-[280px] text-xs">{e.message}</TD>
                <TD className="max-w-[240px] truncate font-mono text-[10px]" title={e.technicalMessage ?? ""}>
                  {e.technicalMessage ?? "—"}
                </TD>
                <TD>
                  {e.order ? (
                    <Link href={`/admin/orders/${e.order.id}`} className="text-accent hover:underline">
                      {e.order.publicId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TD>
                <TD className="text-right tabular">{e.attempts}</TD>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(e.lastAttemptAt)}</TD>
                <TD>
                  <ErrorResolveButton errorId={e.id} resolved={e.resolved} />
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {errors.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Aucune erreur — tout va bien.</p>
      ) : null}
    </div>
  );
}
