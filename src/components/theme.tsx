"use client";

/**
 * Gestion du thème clair/sombre.
 *
 * - ThemeScript : script inline injecté très tôt dans <body> pour appliquer la
 *   classe `dark` AVANT le premier rendu → aucun flash de couleur au chargement.
 *   Choix : préférence enregistrée (localStorage) sinon préférence système.
 * - ThemeToggle : bouton accessible qui bascule et persiste le choix.
 */
import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/icons";

const STORAGE_KEY = "ts-theme";

/** Script sans dépendance, exécuté avant hydratation (évite le flash). */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    // Transition douce ponctuelle (retirée juste après la bascule).
    root.classList.add("theme-transition");
    root.classList.toggle("dark", next);
    root.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* stockage indisponible : la bascule reste effective pour la session */
    }
    setIsDark(next);
    window.setTimeout(() => root.classList.remove("theme-transition"), 300);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mounted && isDark ? "Passer en thème clair" : "Passer en thème sombre"}
      aria-pressed={mounted ? isDark : undefined}
      title={mounted && isDark ? "Thème clair" : "Thème sombre"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {/* Rendu neutre avant montage pour éviter tout écart d'hydratation. */}
      {mounted && isDark ? (
        <IconSun className="h-5 w-5" />
      ) : (
        <IconMoon className="h-5 w-5" />
      )}
      <span className="sr-only">Basculer le thème</span>
    </button>
  );
}
