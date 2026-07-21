/**
 * Statuts métier : unions TypeScript strictes + libellés français + tonalité
 * visuelle. Correspond 1:1 aux enums PostgreSQL de schema.postgres.prisma
 * (SQLite ne supportant pas les enums Prisma, la validation est faite ici et
 * par Zod côté API).
 */

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "pending";

// --- Commande -----------------------------------------------------------------

export const ORDER_STATUSES = [
  "created",
  "pending_payment",
  "paid",
  "hedge_simulated",
  "mint_pending",
  "minted",
  "shipping_pending",
  "shipped",
  "delivered",
  "failed",
  "refunded",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: "Créée",
  pending_payment: "Paiement en attente",
  paid: "Payée",
  hedge_simulated: "Couverture simulée",
  mint_pending: "Token en création",
  minted: "Token émis",
  shipping_pending: "À expédier",
  shipped: "Expédiée",
  delivered: "Livrée",
  failed: "En erreur",
  refunded: "Remboursée",
  cancelled: "Annulée",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  created: "neutral",
  pending_payment: "pending",
  paid: "info",
  hedge_simulated: "info",
  mint_pending: "pending",
  minted: "info",
  shipping_pending: "warning",
  shipped: "info",
  delivered: "success",
  failed: "danger",
  refunded: "neutral",
  cancelled: "neutral",
};

// --- Paiement -------------------------------------------------------------------

export const PAYMENT_STATUSES = ["pending", "processing", "succeeded", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  processing: "En cours",
  succeeded: "Confirmé",
  failed: "Échoué",
  refunded: "Remboursé",
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, BadgeTone> = {
  pending: "pending",
  processing: "pending",
  succeeded: "success",
  failed: "danger",
  refunded: "neutral",
};

// --- Couverture (achat d'action simulé) -------------------------------------------

export const HEDGING_STATUSES = [
  "not_started",
  "pending",
  "processing",
  "simulated_filled",
  "failed",
  "cancelled",
] as const;
export type HedgingStatus = (typeof HEDGING_STATUSES)[number];

export const HEDGING_STATUS_LABELS: Record<HedgingStatus, string> = {
  not_started: "Non démarrée",
  pending: "En attente",
  processing: "En cours",
  simulated_filled: "Exécutée (simulée)",
  failed: "Échouée",
  cancelled: "Annulée",
};

export const HEDGING_STATUS_TONES: Record<HedgingStatus, BadgeTone> = {
  not_started: "neutral",
  pending: "pending",
  processing: "pending",
  simulated_filled: "success",
  failed: "danger",
  cancelled: "neutral",
};

// --- Ordre de vente (rachat + destruction du token) ---------------------------

export const SELL_STATUSES = [
  "pending_broker",
  "sold_pending_burn",
  "burning",
  "completed",
  "failed",
  "cancelled",
] as const;
export type SellStatus = (typeof SELL_STATUSES)[number];

export const SELL_STATUS_LABELS: Record<SellStatus, string> = {
  pending_broker: "Vente courtier en attente",
  sold_pending_burn: "Vendu — token à détruire",
  burning: "Destruction en cours",
  completed: "Vente finalisée",
  failed: "Échouée",
  cancelled: "Annulée",
};

export const SELL_STATUS_TONES: Record<SellStatus, BadgeTone> = {
  pending_broker: "pending",
  sold_pending_burn: "warning",
  burning: "pending",
  completed: "success",
  failed: "danger",
  cancelled: "neutral",
};

export function asSellStatus(value: string): SellStatus {
  if ((SELL_STATUSES as readonly string[]).includes(value)) return value as SellStatus;
  return "pending_broker";
}

// --- Émission du token --------------------------------------------------------------

export const MINT_STATUSES = [
  "not_started",
  "queued",
  "minting",
  "mint_submitted",
  "mint_confirmed",
  "transfer_pending",
  "transfer_submitted",
  "transfer_confirmed",
  "failed",
  "cancelled",
] as const;
export type MintStatus = (typeof MINT_STATUSES)[number];

export const MINT_STATUS_LABELS: Record<MintStatus, string> = {
  not_started: "Non démarrée",
  queued: "En file d'attente",
  minting: "Création en cours",
  mint_submitted: "Transaction soumise",
  mint_confirmed: "Création confirmée",
  transfer_pending: "Transfert en attente",
  transfer_submitted: "Transfert soumis",
  transfer_confirmed: "Transfert confirmé",
  failed: "Échouée",
  cancelled: "Annulée",
};

export const MINT_STATUS_TONES: Record<MintStatus, BadgeTone> = {
  not_started: "neutral",
  queued: "pending",
  minting: "pending",
  mint_submitted: "pending",
  mint_confirmed: "info",
  transfer_pending: "pending",
  transfer_submitted: "pending",
  transfer_confirmed: "success",
  failed: "danger",
  cancelled: "neutral",
};

// --- Transactions blockchain ----------------------------------------------------------

export const TX_STATUSES = ["pending", "submitted", "confirmed", "failed"] as const;
export type TxStatus = (typeof TX_STATUSES)[number];

export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  pending: "En attente",
  submitted: "Soumise",
  confirmed: "Confirmée",
  failed: "Échouée",
};

export const TX_STATUS_TONES: Record<TxStatus, BadgeTone> = {
  pending: "pending",
  submitted: "pending",
  confirmed: "success",
  failed: "danger",
};

// --- Objet physique / livraison ---------------------------------------------------------

export const PHYSICAL_STATUSES = ["not_started", "preparing", "ready", "shipped", "delivered"] as const;
export type PhysicalStatus = (typeof PHYSICAL_STATUSES)[number];

export const PHYSICAL_STATUS_LABELS: Record<PhysicalStatus, string> = {
  not_started: "Non démarrée",
  preparing: "En préparation",
  ready: "Prête à expédier",
  shipped: "Expédiée",
  delivered: "Livrée",
};

export const PHYSICAL_STATUS_TONES: Record<PhysicalStatus, BadgeTone> = {
  not_started: "neutral",
  preparing: "pending",
  ready: "warning",
  shipped: "info",
  delivered: "success",
};

// --- Erreurs -------------------------------------------------------------------------------

export const ERROR_SEVERITIES = ["info", "warning", "error", "critical"] as const;
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

export const ERROR_SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  info: "Information",
  warning: "Avertissement",
  error: "Erreur",
  critical: "Critique",
};

export const ERROR_SEVERITY_TONES: Record<ErrorSeverity, BadgeTone> = {
  info: "info",
  warning: "warning",
  error: "danger",
  critical: "danger",
};

// --- Indices --------------------------------------------------------------------------------

export const MARKET_INDEXES = ["SP500", "CAC40", "NIKKEI225"] as const;
export type MarketIndexName = (typeof MARKET_INDEXES)[number];

export const MARKET_INDEX_LABELS: Record<MarketIndexName, string> = {
  SP500: "S&P 500",
  CAC40: "CAC 40",
  NIKKEI225: "Nikkei 225",
};

// --- Helpers ----------------------------------------------------------------------------------

export function asOrderStatus(value: string): OrderStatus {
  if ((ORDER_STATUSES as readonly string[]).includes(value)) return value as OrderStatus;
  return "created";
}

export function asPaymentStatus(value: string): PaymentStatus {
  if ((PAYMENT_STATUSES as readonly string[]).includes(value)) return value as PaymentStatus;
  return "pending";
}

export function asHedgingStatus(value: string): HedgingStatus {
  if ((HEDGING_STATUSES as readonly string[]).includes(value)) return value as HedgingStatus;
  return "not_started";
}

export function asMintStatus(value: string): MintStatus {
  if ((MINT_STATUSES as readonly string[]).includes(value)) return value as MintStatus;
  return "not_started";
}

export function asTxStatus(value: string): TxStatus {
  if ((TX_STATUSES as readonly string[]).includes(value)) return value as TxStatus;
  return "pending";
}

export function asPhysicalStatus(value: string): PhysicalStatus {
  if ((PHYSICAL_STATUSES as readonly string[]).includes(value)) return value as PhysicalStatus;
  return "not_started";
}

export function asErrorSeverity(value: string): ErrorSeverity {
  if ((ERROR_SEVERITIES as readonly string[]).includes(value)) return value as ErrorSeverity;
  return "error";
}

export function asMarketIndex(value: string): MarketIndexName {
  if ((MARKET_INDEXES as readonly string[]).includes(value)) return value as MarketIndexName;
  return "SP500";
}
