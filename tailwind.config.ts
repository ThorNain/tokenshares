import type { Config } from "tailwindcss";

/**
 * Thème "banque en ligne haut de gamme" : fond crème, encre profonde,
 * un seul accent bleu. Pas de codes graphiques crypto.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0d1b2a",
          soft: "#33415c",
          muted: "#5c677d",
        },
        cream: "#faf9f6",
        accent: {
          DEFAULT: "#1f4fd8",
          hover: "#1a43b8",
          soft: "#eef2fd",
        },
        positive: "#0f7b4f",
        negative: "#b3261e",
        warning: "#9a6700",
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
        card: "0 1px 2px rgba(13,27,42,0.06), 0 8px 24px rgba(13,27,42,0.05)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
