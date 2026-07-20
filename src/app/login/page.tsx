/** Page de connexion (Privy ou mode démonstration). */
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginPanel } from "@/components/login-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/dashboard/portfolio");
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Suspense>
        <LoginPanel />
      </Suspense>
      <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-ink-muted">
        En vous connectant, vous acceptez les conditions du prototype de démonstration. Aucune
        donnée bancaire réelle n&apos;est traitée, aucun mot de passe n&apos;est stocké par
        l&apos;application.
      </p>
    </div>
  );
}
