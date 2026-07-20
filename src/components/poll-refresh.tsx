"use client";

/**
 * Rafraîchit périodiquement les données serveur de la page (utilisé sur la
 * page de confirmation en attendant le webhook de paiement, et sur les vues
 * de suivi).
 */
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PollRefresh({ intervalMs = 2500, maxTicks = 40 }: { intervalMs?: number; maxTicks?: number }) {
  const router = useRouter();
  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      if (ticks > maxTicks) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, maxTicks]);
  return null;
}
