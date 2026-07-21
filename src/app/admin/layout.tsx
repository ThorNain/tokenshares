/**
 * Layout de l'espace entreprise : navigation latérale + indicateur de mode
 * démonstration. Le middleware garantit la session admin (sauf /admin/login,
 * qui est rendue sans navigation).
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/sell-orders", label: "Ventes / rachats" },
  { href: "/admin/shipments", label: "Expéditions" },
  { href: "/admin/users", label: "Clients" },
  { href: "/admin/assets", label: "Actifs" },
  { href: "/admin/reserves", label: "Réserves" },
  { href: "/admin/blockchain", label: "Blockchain" },
  { href: "/admin/errors", label: "Erreurs" },
  { href: "/admin/settings", label: "Paramètres" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const isAdmin = session?.role === "admin";

  if (!isAdmin) {
    // Page de connexion (seule route accessible sans session admin).
    return <>{children}</>;
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Espace entreprise</h1>
          {env.demoMode ? <Badge tone="warning">Mode démonstration actif</Badge> : null}
        </div>
        <p className="text-sm text-ink-muted">{session?.email}</p>
      </div>
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="flex flex-row flex-wrap gap-1 lg:w-48 lg:flex-col lg:gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-white hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
