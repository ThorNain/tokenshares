/**
 * Paramètres globaux persistés (table Setting) : taux de marge, pause des
 * nouvelles commandes. Modifiables par l'administrateur.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_MARGIN_RATE } from "@/lib/pricing";

export const SETTING_KEYS = {
  marginRate: "margin_rate",
  ordersPaused: "orders_paused",
} as const;

export async function getMarginRate(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.marginRate } });
  if (!setting) return DEFAULT_MARGIN_RATE;
  const parsed = Number(setting.value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return DEFAULT_MARGIN_RATE;
  return parsed;
}

export async function setMarginRate(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`Taux de marge invalide : ${rate}`);
  }
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.marginRate },
    create: { key: SETTING_KEYS.marginRate, value: String(rate) },
    update: { value: String(rate) },
  });
}

export async function areOrdersPaused(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.ordersPaused } });
  return setting?.value === "true";
}

export async function setOrdersPaused(paused: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEYS.ordersPaused },
    create: { key: SETTING_KEYS.ordersPaused, value: String(paused) },
    update: { value: String(paused) },
  });
}

/** Marge effective d'un actif : marge spécifique si définie, sinon globale. */
export async function getEffectiveMarginRate(assetMarginOverride: number | null): Promise<number> {
  if (assetMarginOverride !== null && Number.isFinite(assetMarginOverride)) {
    return assetMarginOverride;
  }
  return getMarginRate();
}
