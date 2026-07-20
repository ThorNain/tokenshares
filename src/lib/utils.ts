/**
 * Utilitaires partagés client/serveur : classes CSS, formatage fr-FR,
 * liens vers l'explorateur blockchain.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { convertToEuro, EURO_CURRENCY } from "@/lib/fx";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency: string): string {
  try {
    const euroAmount = convertToEuro(amount, currency);
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: EURO_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(euroAmount);
  } catch {
    return `${amount.toFixed(2)} €`;
  }
}

export function formatPercent(rate: number, digits = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: Math.max(digits, 2),
  }).format(rate);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function shortHex(value: string | null | undefined, chars = 6): string {
  if (!value) return "—";
  if (value.length <= chars * 2 + 2) return value;
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

/** URL de l'explorateur de blocs (variables NEXT_PUBLIC_*, sûres côté client). */
const EXPLORER = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org";

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

export const CHAIN_NAME = process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Base Sepolia";

/** Durée lisible entre deux dates (pour la timeline de progression). */
export function formatDuration(from: Date | null | undefined, to: Date | null | undefined): string {
  if (!from || !to) return "—";
  const ms = Math.max(0, to.getTime() - from.getTime());
  if (ms < 1000) return "< 1 s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} j`;
}
