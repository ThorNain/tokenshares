"use client";

/**
 * Boutons de la page de paiement SIMULÉE : succès ou échec. Le résultat est
 * envoyé au « webhook » mock qui suit le même pipeline idempotent que Stripe.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Alert } from "@/components/ui";

export function MockPayButtons({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"success" | "failure" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(outcome: "success" | "failure") {
    setError(null);
    setLoading(outcome);
    try {
      const res = await fetch("/api/webhooks/mock-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, outcome }),
      });
      const data = (await res.json()) as { ok?: boolean; redirect?: string; error?: string };
      if (!res.ok || !data.redirect) {
        setError(data.error ?? "Erreur lors de la simulation.");
        setLoading(null);
        return;
      }
      router.push(data.redirect);
    } catch {
      setError("Erreur réseau.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        size="lg"
        className="w-full"
        onClick={() => submit("success")}
        loading={loading === "success"}
        disabled={loading !== null}
      >
        Simuler un paiement réussi
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="w-full"
        onClick={() => submit("failure")}
        loading={loading === "failure"}
        disabled={loading !== null}
      >
        Simuler un paiement refusé
      </Button>
    </div>
  );
}
