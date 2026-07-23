"use client";

/**
 * Case « Offrir en cadeau » sur le checkout. Bascule l'option cadeau de la
 * commande (mint différé + code de réclamation). Modifiable avant paiement.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui";

export function GiftToggle({ orderId, initial }: { orderId: string; initial: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setError(null);
    setChecked(next);
    const res = await fetch(`/api/orders/${orderId}/gift`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isGift: next }),
    });
    if (!res.ok) {
      setChecked(!next);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Modification impossible.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-surface p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[color:rgb(var(--color-accent))]"
        />
        <span>
          <span className="text-sm font-medium text-ink">🎁 Offrir en cadeau</span>
          <span className="mt-1 block text-xs text-ink-muted">
            Aucun token n&apos;est créé à l&apos;achat. Vous recevrez un lien avec un code à
            transmettre : la personne se connectera, et le token sera émis dans son propre wallet.
            L&apos;adresse de livraison sera renseignée par le destinataire.
          </span>
        </span>
      </label>
      {error ? (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </div>
  );
}
