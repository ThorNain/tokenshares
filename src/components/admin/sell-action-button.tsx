"use client";

/** Action simple sur un ordre de vente (relancer la destruction, annuler). */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui";

export function AdminSellActionButton({
  sellOrderId,
  action,
  label,
  variant = "ghost",
}: {
  sellOrderId: string;
  action: "retry_burn" | "cancel";
  label: string;
  variant?: ButtonProps["variant"];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    const confirmMsg =
      action === "cancel"
        ? "Annuler cet ordre de vente ?"
        : "Relancer la destruction du token pour cet ordre ?";
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/sell-orders/${sellOrderId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(data.error ?? "Action échouée.");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={variant} loading={busy} onClick={run}>
      {label}
    </Button>
  );
}
