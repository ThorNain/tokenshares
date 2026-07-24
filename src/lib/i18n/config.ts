/**
 * Configuration i18n légère : sélection de langue par cookie, SANS refonte des
 * URLs. Le français est la langue native par défaut. Ce module ne contient que
 * des constantes (importable côté client comme serveur).
 */
export const LOCALES = ["fr", "en", "es", "de"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "ts-locale";

/** Libellés affichés dans le sélecteur (chaque langue dans sa propre langue). */
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  de: "Deutsch",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
