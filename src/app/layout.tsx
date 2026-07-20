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
    <html lang="fr">
      <body className="flex min-h-screen flex-col">
        <AppProviders>
          <DemoBanner />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
