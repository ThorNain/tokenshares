import type { Config } from "tailwindcss";

/**
 * Thème "banque en ligne haut de gamme" : fond crème, encre profonde, un seul
 * accent bleu. Pas de codes graphiques crypto.
 *
 * Les couleurs sont pilotées par des variables CSS (triplets RGB définis dans
 * globals.css sous :root et .dark) afin de supporter le mode sombre sans
 * dupliquer les classes `dark:` sur chaque élément. Le format
 * `rgb(var(--x) / <alpha-value>)` préserve les modificateurs d'opacité Tailwind
 * (ex. `bg-ink/10`, `border-ink/15`).
 */
function withVar(name: string) {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: withVar("ink"),
          soft: withVar("ink-soft"),
          muted: withVar("ink-muted"),
        },
        cream: withVar("cream"),
        // Surfaces : cartes/nav/pied de page (blanc en clair, gris foncé élevé
        // en sombre) et panneaux à fort contraste (navy + texte blanc).
        surface: withVar("surface"),
        panel: withVar("panel"),
        accent: {
          DEFAULT: withVar("accent"),
          hover: withVar("accent-hover"),
          soft: withVar("accent-soft"),
        },
        positive: withVar("positive"),
        negative: withVar("negative"),
        warning: withVar("warning"),
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--shadow-rgb) / 0.06), 0 8px 24px rgb(var(--shadow-rgb) / 0.05)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
