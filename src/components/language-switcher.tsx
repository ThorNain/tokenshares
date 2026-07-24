"use client";

/**
 * Sélecteur de langue global (menu déroulant, icône globe). Enregistre le choix
 * dans le cookie `ts-locale` puis rafraîchit la route : les composants serveur
 * se re-rendent dans la nouvelle langue, sans rechargement complet.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { IconGlobe, IconCheck } from "@/components/icons";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(loc: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${loc};path=/;max-age=${ONE_YEAR};samesite=lax`;
    setOpen(false);
    if (loc !== current) router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 px-3 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <IconGlobe className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase">{current}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 min-w-[9rem] overflow-hidden rounded-xl border border-ink/10 bg-surface py-1 shadow-card"
        >
          {LOCALES.map((loc) => (
            <button
              key={loc}
              type="button"
              role="menuitemradio"
              aria-checked={loc === current}
              onClick={() => choose(loc)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-ink/5 ${
                loc === current ? "font-semibold text-ink" : "text-ink-soft"
              }`}
            >
              {LOCALE_LABELS[loc]}
              {loc === current ? <IconCheck className="h-4 w-4 text-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
