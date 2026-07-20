/**
 * Badges de statut métier : libellé français + tonalité + pastille (le code
 * visuel ne repose pas uniquement sur la couleur).
 */
import { Badge } from "@/components/ui";
import {
  asOrderStatus,
  asPaymentStatus,
  asHedgingStatus,
  asMintStatus,
  asTxStatus,
  asPhysicalStatus,
  asErrorSeverity,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  HEDGING_STATUS_LABELS,
  HEDGING_STATUS_TONES,
  MINT_STATUS_LABELS,
  MINT_STATUS_TONES,
  TX_STATUS_LABELS,
  TX_STATUS_TONES,
  PHYSICAL_STATUS_LABELS,
  PHYSICAL_STATUS_TONES,
  ERROR_SEVERITY_LABELS,
  ERROR_SEVERITY_TONES,
} from "@/lib/status";

export function OrderStatusBadge({ status }: { status: string }) {
  const s = asOrderStatus(status);
  return <Badge tone={ORDER_STATUS_TONES[s]}>● {ORDER_STATUS_LABELS[s]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const s = asPaymentStatus(status);
  return <Badge tone={PAYMENT_STATUS_TONES[s]}>● {PAYMENT_STATUS_LABELS[s]}</Badge>;
}

export function HedgingStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const s = asHedgingStatus(status);
  return <Badge tone={HEDGING_STATUS_TONES[s]}>● {HEDGING_STATUS_LABELS[s]}</Badge>;
}

export function MintStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const s = asMintStatus(status);
  return <Badge tone={MINT_STATUS_TONES[s]}>● {MINT_STATUS_LABELS[s]}</Badge>;
}

export function TxStatusBadge({ status }: { status: string }) {
  const s = asTxStatus(status);
  return <Badge tone={TX_STATUS_TONES[s]}>● {TX_STATUS_LABELS[s]}</Badge>;
}

export function PhysicalStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const s = asPhysicalStatus(status);
  return <Badge tone={PHYSICAL_STATUS_TONES[s]}>● {PHYSICAL_STATUS_LABELS[s]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const s = asErrorSeverity(severity);
  return <Badge tone={ERROR_SEVERITY_TONES[s]}>● {ERROR_SEVERITY_LABELS[s]}</Badge>;
}
