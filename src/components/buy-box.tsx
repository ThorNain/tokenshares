"use client";

/**
 * Encadré d'achat de la page actif : quantité, détail du prix (indicatif +
 * marge affichée explicitement avant paiement), création de la commande.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Alert } from "@/components/ui";
import { IconMinus, IconPlus } from "@/components/icons";
import { formatMoney, formatPercent } from "@/lib/utils";

export interface BuyBoxProps {
  ticker: string;
  currency: string;
  unitPrice: number;
  unitFinalPrice: number;
  marginRate: number;
  isAuthenticated: boolean;
}

export function BuyBox({
  ticker,
  currency,
  unitPrice,
  unitFinalPrice,
  marginRate,
  isAuthenticated,
}: BuyBoxProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = unitPrice * quantity;
  const total = unitFinalPrice * quantity;
  const margin = total - subtotal;

  async function buy() {
    setError(null);
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/assets/${ticker}`)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, quantity }),
      });
      const data = (await res.json()) as { ok?: boolean; orderId?: string; error?: string };
      if (!res.ok || !data.orderId) {
        setError(data.error ?? "Impossible de créer la commande.");
        return;
      }
      router.push(`/checkout/${data.orderId}`);
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Quantité</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Diminuer la quantité"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink/5"
          >
            <IconMinus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-base font-semibold tabular">{quantity}</span>
          <button
            type="button"
            aria-label="Augmenter la quantité"
            onClick={() => setQuantity((q) => Math.min(10, q + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink hover:bg-ink/5"
          >
            <IconPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">
            Prix indicatif × {quantity}
          </dt>
          <dd className="tabular text-ink">{formatMoney(subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-muted">Marge commerciale ({formatPercent(marginRate)})</dt>
          <dd className="tabular text-ink">{formatMoney(margin, currency)}</dd>
        </div>
        <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
          <dt className="text-ink">Total à payer</dt>
          <dd className="tabular text-ink">{formatMoney(total, currency)}</dd>
        </div>
      </dl>

      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <Button onClick={buy} loading={loading} size="lg" className="mt-5 w-full">
        {isAuthenticated ? "Acheter" : "Se connecter pour acheter"}
      </Button>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Paiement en mode test uniquement — aucun débit réel.
      </p>
    </Card>
  );
}
