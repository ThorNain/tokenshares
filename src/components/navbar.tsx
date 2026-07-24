/**
 * Navigation principale (composant serveur : lit la session).
 */
import Link from "next/link";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme";

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            TokenShares
          </Link>
          <div className="hidden items-center gap-6 text-sm text-ink-soft sm:flex">
            <Link href="/assets" className="hover:text-ink">
              Actifs
            </Link>
            <Link href="/risk-disclosure" className="hover:text-ink">
              Risques
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          {session ? (
            <>
              {session.role === "admin" ? (
                <Link
                  href="/admin"
                  className="rounded-full border border-ink/15 px-4 py-1.5 font-medium text-ink hover:bg-ink/5"
                >
                  Administration
                </Link>
              ) : null}
              <Link
                href="/dashboard/portfolio"
                className="rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent-hover"
              >
                Mon espace
              </Link>
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent-hover"
            >
              Se connecter
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
