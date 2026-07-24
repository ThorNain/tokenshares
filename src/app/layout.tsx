/**
 * Layout racine : navigation, contenu, pied de page. Fournit le contexte Privy
 * quand il est configuré.
 */
import type { Metadata, Viewport } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { AppProviders } from "@/components/app-providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ThemeScript } from "@/components/theme";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: {
    default: "TokenShares",
    template: "%s · TokenShares",
  },
  description:
    "TokenShares — tokens numériques indexés sur le cours d'actions cotées. Ces tokens ne constituent ni une action, ni un instrument financier.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        {/* Applique le thème avant le premier rendu (aucun flash). */}
        <ThemeScript />
        {/* Barre de progression en haut à chaque navigation (couleur d'accent,
            adaptée au thème via la variable CSS). */}
        <NextTopLoader color="rgb(var(--color-accent))" height={3} showSpinner={false} />
        {/* Lien d'évitement clavier vers le contenu principal (accessibilité). */}
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Aller au contenu principal
        </a>
        <AppProviders>
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
