"use client";

/**
 * Bouton admin « Synchroniser la blockchain » : déclenche l'indexation des
 * transferts on-chain + la réconciliation de la propriété, puis rafraîchit.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Alert } from "@/components/ui";
import { IconRefresh } from "@/components/icons";

export function ChainSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/chain-sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        skipped?: boolean;
        reason?: string;
        initialized?: boolean;
        eventsIndexed?: number;
        reconciled?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Synchronisation impossible.");
        return;
      }
      if (data.skipped) {
        setMsg(data.reason ?? "Synchronisation ignorée.");
      } else if (data.initialized) {
        setMsg("Surveillance initialisée : les transferts à venir seront indexés.");
      } else {
        setMsg(
          `Synchronisé. ${data.eventsIndexed ?? 0} événement(s) indexé(s), ${data.reconciled ?? 0} transfert(s) réconcilié(s).`,
        );
      }
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={run} loading={busy}>
        <IconRefresh className="h-4 w-4" /> Synchroniser la blockchain
      </Button>
      {msg ? <Alert tone="success">{msg}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  );
}
