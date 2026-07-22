"use client";

/**
 * Action admin de saisie d'un prix réel d'exécution (courtier manuel) :
 * confirmation du prix d'achat de couverture, ou du prix de vente. Poste vers
 * l'endpoint fourni avec un `executedPrice` numérique, puis rafraîchit.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Alert, Label, Input, type ButtonProps } from "@/components/ui";

export function PriceActionButton({
  endpoint,
  action,
  label,
  title,
  helpText,
  currency,
  variant = "primary",
  size = "sm",
}: {
  endpoint: string;
  action: string;
  label: string;
  title: string;
  helpText: string;
  currency: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy]);

  async function submit() {
    setError(null);
    const executedPrice = Number(price.replace(",", "."));
    if (!Number.isFinite(executedPrice) || executedPrice <= 0) {
      setError("Saisissez un prix valide.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, executedPrice }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Action échouée.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
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
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{helpText}</p>
            <div className="mt-4">
              <Label htmlFor="executed-price">Prix réel d&apos;exécution ({currency})</Label>
              <Input
                id="executed-price"
                inputMode="decimal"
                placeholder="ex. 212.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            {error ? (
              <Alert tone="danger" className="mt-4">
                {error}
              </Alert>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Annuler
              </Button>
              <Button onClick={submit} loading={busy}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
