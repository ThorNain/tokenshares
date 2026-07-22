/**
 * Layout racine : bannière « Prototype de démonstration », navigation,
 * contenu, pied de page. Fournit le contexte Privy quand il est configuré.
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { DemoBanner } from "@/components/demo-banner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeScript } from "@/components/theme";

export const metadata: Metadata = {
  title: {
    default: "TokenShares — Prototype de démonstration",
    template: "%s · TokenShares (démo)",
  },
  description:
    "Prototype de démonstration : tokens numériques indexés sur des actions cotées. Aucun investissement réel, aucun instrument financier.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {/* Applique le thème avant le premier rendu (aucun flash). */}
        <ThemeScript />
        {/* Lien d'évitement clavier vers le contenu principal (accessibilité). */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Aller au contenu principal
        </a>
        <AppProviders>
          <DemoBanner />
          <Navbar />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
