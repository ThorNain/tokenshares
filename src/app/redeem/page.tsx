/** Page de réclamation d'un cadeau. Le code peut être pré-rempli via ?code=. */
import type { Metadata } from "next";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { RedeemPanel } from "@/components/redeem-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Réclamer un cadeau" };

export default async function RedeemPage({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const session = await getSession();
  const code = typeof searchParams.code === "string" ? searchParams.code : "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Suspense>
        <RedeemPanel initialCode={code} isAuthenticated={Boolean(session)} />
      </Suspense>
    </div>
  );
}
