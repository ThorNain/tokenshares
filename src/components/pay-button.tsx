"use client";

/**
 * Bouton de paiement : demande la création de la session de paiement (Stripe
 * Checkout test ou page simulée) puis redirige. La confirmation viendra du
 * webhook — jamais de ce composant.
 */
import { useState } from "react";
import { Button, Alert } from "@/components/ui";

export function PayButton({ orderId, disabled }: { orderId: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Le paiement est momentanément indisponible.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="lg" className="w-full" onClick={pay} loading={loading} disabled={disabled}>
        Procéder au paiement (test)
      </Button>
      {disabled ? (
        <p className="text-center text-xs text-ink-muted">
          Enregistrez d&apos;abord votre adresse de livraison.
        </p>
      ) : null}
    </div>
  );
}
