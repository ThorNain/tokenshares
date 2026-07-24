/**
 * Point d'entrée i18n CÔTÉ SERVEUR : détermine la langue à partir du cookie
 * `ts-locale` (repli FR) et fournit le dictionnaire correspondant. Lit le
 * cookie → rend dynamique le composant appelant (déjà le cas de tout le site,
 * dont le layout lit la session).
 */
import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import fr from "@/lib/i18n/dictionaries/fr";
import en from "@/lib/i18n/dictionaries/en";
import es from "@/lib/i18n/dictionaries/es";
import de from "@/lib/i18n/dictionaries/de";

const DICTIONARIES: Record<Locale, Dictionary> = { fr, en, es, de };

export function getLocale(): Locale {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Raccourci : dictionnaire de la langue courante. */
export function getT(): Dictionary {
  return DICTIONARIES[getLocale()];
}
