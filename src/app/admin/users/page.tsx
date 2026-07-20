/** Vue clients : comptes, wallets publics, volume de commandes. */
import Link from "next/link";
import { prisma } from "@/lib/db";
import { TableWrap, Table, TH, TD, Badge, Input, Button } from "@/components/ui";
import { formatDateTime, shortHex } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim();
  const users = await prisma.user.findMany({
    where: {
      role: "customer",
      ...(q
        ? {
            OR: [
              { email: { contains: q } },
              { firstName: { contains: q } },
              { lastName: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { wallets: true, _count: { select: { orders: true } } },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">
          Clients <span className="text-sm font-normal text-ink-muted">({users.length})</span>
        </h2>
        <form method="GET" className="flex gap-2">
          <Input name="q" placeholder="Nom ou e-mail…" defaultValue={q ?? ""} className="w-64" />
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
        </form>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <TH>Client</TH>
              <TH>E-mail</TH>
              <TH>ID Privy</TH>
              <TH>Wallet(s) public(s)</TH>
              <TH>Créé le</TH>
              <TH className="text-right">Commandes</TH>
              <TH />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-cream/60">
                <TD>
                  <div className="font-medium">
                    {u.lastName || u.firstName ? `${u.lastName ?? ""} ${u.firstName ?? ""}` : "—"}
                  </div>
                  <div className="font-mono text-[10px] text-ink-muted">{u.id}</div>
                </TD>
                <TD className="text-xs">{u.email}</TD>
                <TD className="font-mono text-[10px]">{u.privyUserId ?? "—"}</TD>
                <TD>
                  {u.wallets.length === 0
                    ? "—"
                    : u.wallets.map((w) => (
                        <div key={w.id} className="font-mono text-[10px]">
                          {shortHex(w.address, 8)}{" "}
                          <Badge tone={w.provider === "privy" ? "info" : "neutral"}>
                            {w.provider}
                          </Badge>
                        </div>
                      ))}
                </TD>
                <TD className="whitespace-nowrap text-xs">{formatDateTime(u.createdAt)}</TD>
                <TD className="text-right tabular">{u._count.orders}</TD>
                <TD>
                  <Link
                    href={`/admin/orders?email=${encodeURIComponent(u.email)}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Commandes →
                  </Link>
                </TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
