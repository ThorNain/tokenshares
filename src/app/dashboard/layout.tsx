/** Layout de l'espace client : onglets Portefeuille / Commandes / Sécurité. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/portfolio");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Mon espace</h1>
          <p className="text-sm text-ink-muted">{session.email}</p>
        </div>
        <nav className="flex gap-1 rounded-full border border-ink/10 bg-white p-1 text-sm">
          <Link href="/dashboard/portfolio" className="rounded-full px-4 py-1.5 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
            Portefeuille
          </Link>
          <Link href="/dashboard/orders" className="rounded-full px-4 py-1.5 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
            Commandes
          </Link>
          <Link href="/dashboard/security" className="rounded-full px-4 py-1.5 font-medium text-ink-soft hover:bg-ink/5 hover:text-ink">
            Sécurité
          </Link>
        </nav>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
