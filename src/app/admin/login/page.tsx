/** Connexion administrateur. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connexion administrateur" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "admin") redirect("/admin");
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Suspense>
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
