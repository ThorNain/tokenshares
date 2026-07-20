"use client";

/** Paramètres globaux : marge (10 % par défaut) et pause des commandes. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label, Alert, Card } from "@/components/ui";

export function SettingsForm({
  marginRate,
  ordersPaused,
}: {
  marginRate: number;
  ordersPaused: boolean;
}) {
  const router = useRouter();
  const [margin, setMargin] = useState(String(Math.round(marginRate * 10000) / 100));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(body: Record<string, unknown>, confirmMessage?: string) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Enregistrement impossible.");
      return;
    }
    setMsg("Paramètres enregistrés.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-ink">Marge commerciale globale</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Appliquée à tous les actifs sans marge spécifique. Défaut : 10 %.
        </p>
        <div className="mt-4 flex items-end gap-3">
          <div>
            <Label htmlFor="margin">Taux (%)</Label>
            <Input
              id="margin"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              inputMode="decimal"
              className="w-28"
            />
          </div>
          <Button
            loading={busy}
            onClick={() => {
              const rate = Number(margin.replace(",", ".")) / 100;
              if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
                setError("Taux invalide (entre 0 et 100 %).");
                return;
              }
              save(
                { marginRate: rate },
                `Appliquer une marge globale de ${margin} % aux prochaines commandes ?`,
              );
            }}
          >
            Enregistrer
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-ink">Nouvelles commandes</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Statut actuel :{" "}
          <strong className={ordersPaused ? "text-negative" : "text-positive"}>
            {ordersPaused ? "suspendues" : "ouvertes"}
          </strong>
        </p>
        <Button
          variant={ordersPaused ? "primary" : "danger"}
          className="mt-4"
          loading={busy}
          onClick={() =>
            save(
              { ordersPaused: !ordersPaused },
              ordersPaused
                ? "Réouvrir les nouvelles commandes ?"
                : "Suspendre temporairement toutes les nouvelles commandes ?",
            )
          }
        >
          {ordersPaused ? "Réouvrir les commandes" : "Suspendre les commandes"}
        </Button>
      </Card>

      {msg ? <Alert tone="success">{msg}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
