/**
 * Conversion d'affichage et de facturation vers l'euro.
 *
 * Le prototype utilise des taux fixes et configurables afin de rester
 * déterministe et de ne pas dépendre d'un service de change externe.
 * Avant une utilisation réelle, ce module devra être remplacé par un
 * fournisseur FX agréé avec horodatage et conservation du taux appliqué.
 */

export const EURO_CURRENCY = "EUR" as const;

function positiveRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const EURO_RATES: Readonly<Record<string, number>> = {
  EUR: 1,
  USD: positiveRate(process.env.NEXT_PUBLIC_FX_USD_EUR_RATE, 0.92),
  JPY: positiveRate(process.env.NEXT_PUBLIC_FX_JPY_EUR_RATE, 0.0061),
};

/** Convertit un montant de sa devise source vers l'euro. */
export function convertToEuro(amount: number, sourceCurrency: string): number {
  if (!Number.isFinite(amount)) throw new Error(`Montant invalide : ${amount}`);
  const currency = sourceCurrency.toUpperCase();
  const rate = EURO_RATES[currency];
  if (rate === undefined) {
    throw new Error(`Taux de change EUR indisponible pour ${currency}`);
  }
  return amount * rate;
}

export function euroRate(sourceCurrency: string): number {
  return convertToEuro(1, sourceCurrency);
}
