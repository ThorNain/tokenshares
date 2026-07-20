/**
 * Moteur de prix : calcul centralisé du prix de vente (prix indicatif + marge
 * commerciale). Fonctions pures, testées unitairement (pricing.test.ts).
 */

export const DEFAULT_MARGIN_RATE = 0.1;

/** Devises « zéro décimale » au sens de Stripe (montants en unités entières). */
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "CLP"]);

export function isZeroDecimalCurrency(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
}

/** Arrondi monétaire : 0 décimale pour JPY, 2 sinon. */
export function roundCurrency(value: number, currency: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Montant invalide : ${value}`);
  }
  if (isZeroDecimalCurrency(currency)) return Math.round(value);
  return Math.round(value * 100) / 100;
}

/**
 * Prix final payé par le client :
 *   Prix final = prix indicatif de l'action × (1 + taux de marge)
 * Exemple : 200 € × 1,10 = 220 € (marge de 20 €).
 */
export function calculateSellingPrice(marketPrice: number, marginRate: number): number {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
    throw new Error(`Prix de marché invalide : ${marketPrice}`);
  }
  if (!Number.isFinite(marginRate) || marginRate < 0 || marginRate > 1) {
    throw new Error(`Taux de marge invalide : ${marginRate} (attendu entre 0 et 1)`);
  }
  return marketPrice * (1 + marginRate);
}

/** Montant de la marge seule. */
export function calculateMarginAmount(marketPrice: number, marginRate: number): number {
  return calculateSellingPrice(marketPrice, marginRate) - marketPrice;
}

/**
 * Détail complet d'une ligne de commande, arrondi dans la devise du titre.
 */
export function computeOrderLine(params: {
  marketPrice: number;
  quantity: number;
  marginRate: number;
  currency: string;
}): {
  unitSellingPrice: number;
  subtotal: number;
  marginAmount: number;
  total: number;
} {
  const { marketPrice, quantity, marginRate, currency } = params;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    throw new Error(`Quantité invalide : ${quantity} (entier entre 1 et 100)`);
  }
  const unitSellingPrice = roundCurrency(calculateSellingPrice(marketPrice, marginRate), currency);
  const subtotal = roundCurrency(marketPrice * quantity, currency);
  const total = roundCurrency(unitSellingPrice * quantity, currency);
  const marginAmount = roundCurrency(total - subtotal, currency);
  return { unitSellingPrice, subtotal, marginAmount, total };
}

/**
 * Conversion en plus petite unité de la devise (centimes…) pour Stripe.
 * JPY : pas de décimales — le montant est déjà en unité minimale.
 */
export function toMinorUnits(amount: number, currency: string): number {
  const rounded = roundCurrency(amount, currency);
  return isZeroDecimalCurrency(currency) ? rounded : Math.round(rounded * 100);
}

/** Conversion inverse : montant Stripe (unité minimale) → montant décimal. */
export function fromMinorUnits(minorAmount: number, currency: string): number {
  return isZeroDecimalCurrency(currency) ? minorAmount : minorAmount / 100;
}
