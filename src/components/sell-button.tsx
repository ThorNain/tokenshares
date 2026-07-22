"use client";

/**
 * Bouton « Vendre » d'une position du portefeuille. Ouvre une confirmation
 * (quantité), appelle /api/sell, puis rafraîchit. En mode courtier manuel, la
 * vente réelle est exécutée ensuite par l'opérateur (message explicatif).
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Alert, Label, Input } from "@/components/ui";
import { formatMoney } from "@/lib/utils";

export function SellButton({
  assetId,
  ticker,
  sellableQuantity,
  currentPrice,
  currency,
}: {
  assetId: string;
  ticker: string;
  sellableQuantity: number;
  currentPrice: number;
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  if (sellableQuantity < 1) {
    return <span className="text-xs text-ink-muted">—</span>;
  }

  async function submit() {
    setError(null);
    if (quantity < 1 || quantity > sellableQuantity) {
      setError(`Quantité entre 1 et ${sellableQuantity}.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, quantity }),
      });
      const data = (await res.json()) as { ok?: boolean; pending?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Vente impossible.");
        return;
      }
      setMessage(
        data.pending
          ? "Demande de vente enregistrée. La vente de l'action réelle sera exécutée puis le token détruit — le prix final sera confirmé par l'opérateur."
          : "Vente exécutée : le token a été détruit et retiré de la chaîne.",
      );
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Vendre
      </Button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`Vendre ${ticker}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ink">Vendre des tokens {ticker}</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Prix indicatif actuel : {formatMoney(currentPrice, currency)}. Vous pouvez vendre
              jusqu&apos;à {sellableQuantity} token(s).
            </p>

            {!message ? (
              <>
                <div className="mt-4">
                  <Label htmlFor="sell-qty">Quantité à vendre</Label>
                  <Input
                    id="sell-qty"
                    type="number"
                    min={1}
                    max={sellableQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <p className="mt-3 text-sm text-ink">
                  Produit indicatif estimé :{" "}
                  <strong>{formatMoney(currentPrice * quantity, currency)}</strong>
                </p>
              </>
            ) : null}

            {error ? (
              <Alert tone="danger" className="mt-4">
                {error}
              </Alert>
            ) : null}
            {message ? (
              <Alert tone="success" className="mt-4">
                {message}
              </Alert>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {message ? "Fermer" : "Annuler"}
              </Button>
              {!message ? (
                <Button variant="danger" onClick={submit} loading={busy}>
                  Confirmer la vente
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
