/**
 * Timeline de progression d'une commande (12 étapes — section 21).
 * Chaque étape expose : statut, date, durée depuis l'étape précédente,
 * erreurs, nombre de tentatives et acteur ayant déclenché l'action.
 */
import type { FullOrder } from "@/lib/order-includes";

export type TimelineStepStatus = "done" | "current" | "pending" | "error" | "cancelled";

export interface TimelineStep {
  key: string;
  label: string;
  status: TimelineStepStatus;
  date: Date | null;
  attempts: number | null;
  error: string | null;
  /** Acteur ayant déclenché l'action (depuis le journal d'audit). */
  actor: string | null;
}

function actorFor(order: FullOrder, actions: string[]): string | null {
  for (let i = order.auditLogs.length - 1; i >= 0; i--) {
    const log = order.auditLogs[i]!;
    if (actions.includes(log.action)) {
      if (log.actorEmail) return log.actorEmail;
      if (log.actorType === "system") return "Système";
      if (log.actorType === "admin") return "Administrateur";
      return "Client";
    }
  }
  return null;
}

export function buildOrderTimeline(order: FullOrder): TimelineStep[] {
  const payment = order.payment;
  const hedging = order.hedgingOrder;
  const mint = order.tokenMint;
  const physical = order.physicalItem;
  const activeQr = order.qrCodes.find((q) => q.active) ?? order.qrCodes[0] ?? null;
  const closed = order.status === "refunded" || order.status === "cancelled";

  type Raw = {
    key: string;
    label: string;
    done: boolean;
    date: Date | null;
    error?: string | null;
    attempts?: number | null;
    actorActions?: string[];
  };

  const raw: Raw[] = [
    {
      key: "created",
      label: "Commande créée",
      done: true,
      date: order.createdAt,
      actorActions: ["order_created"],
    },
    {
      key: "payment_initiated",
      label: "Paiement initié",
      done: Boolean(payment),
      date: payment?.createdAt ?? null,
      actorActions: ["payment_initiated"],
    },
    {
      key: "payment_confirmed",
      label: "Paiement confirmé",
      done: payment?.status === "succeeded" || payment?.status === "refunded",
      date: payment?.paidAt ?? null,
      error: payment?.status === "failed" ? (payment.failureMessage ?? "Paiement échoué") : null,
      actorActions: ["payment_confirmed"],
    },
    {
      key: "hedge_started",
      label: "Achat de couverture lancé",
      done: Boolean(hedging),
      date: hedging?.createdAt ?? null,
      attempts: hedging?.attempts ?? null,
    },
    {
      key: "hedge_filled",
      label: "Achat de couverture simulé",
      done: hedging?.status === "simulated_filled",
      date: hedging?.executedAt ?? null,
      error: hedging?.status === "failed" ? (hedging.lastError ?? "Couverture échouée") : null,
      attempts: hedging?.attempts ?? null,
      actorActions: ["hedging_simulated_filled"],
    },
    {
      key: "mint_started",
      label: "Token en cours de création",
      done: Boolean(mint) && mint!.status !== "not_started",
      date: mint?.createdAt ?? null,
      attempts: mint?.attempts ?? null,
    },
    {
      key: "mint_confirmed",
      label: "Token créé",
      done:
        mint != null &&
        ["mint_confirmed", "transfer_pending", "transfer_submitted", "transfer_confirmed"].includes(
          mint.status,
        ),
      date: mint?.submittedAt ?? null,
      error: mint?.status === "failed" ? (mint.lastError ?? "Émission échouée") : null,
      attempts: mint?.attempts ?? null,
    },
    {
      key: "transfer_confirmed",
      label: "Token transféré vers le wallet",
      done: mint?.status === "transfer_confirmed",
      date: mint?.confirmedAt ?? null,
      actorActions: ["token_minted"],
    },
    {
      key: "qr_generated",
      label: "QR code généré",
      done: Boolean(activeQr),
      date: activeQr?.createdAt ?? null,
      actorActions: ["qr_generated", "qr_regenerated"],
    },
    {
      key: "physical_prepared",
      label: "Objet physique préparé",
      done: physical != null && physical.status !== "not_started",
      date: physical ? physical.createdAt : null,
    },
    {
      key: "shipped",
      label: "Commande expédiée",
      done: physical?.status === "shipped" || physical?.status === "delivered",
      date: physical?.shippedAt ?? null,
      actorActions: ["order_shipped"],
    },
    {
      key: "delivered",
      label: "Commande livrée",
      done: physical?.status === "delivered",
      date: physical?.deliveredAt ?? null,
      actorActions: ["order_delivered"],
    },
  ];

  let currentAssigned = false;
  return raw.map((step) => {
    let status: TimelineStepStatus;
    if (step.done) {
      status = "done";
    } else if (step.error) {
      status = "error";
      currentAssigned = true;
    } else if (closed) {
      status = "cancelled";
    } else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else {
      status = "pending";
    }
    return {
      key: step.key,
      label: step.label,
      status,
      date: step.date,
      attempts: step.attempts ?? null,
      error: step.error ?? null,
      actor: step.actorActions ? actorFor(order, step.actorActions) : null,
    };
  });
}
