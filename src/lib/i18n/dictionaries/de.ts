import type { Dictionary } from "@/lib/i18n/types";

const de: Dictionary = {
  nav: {
    assets: "Werte",
    risks: "Risiken",
    admin: "Verwaltung",
    myAccount: "Mein Bereich",
    login: "Anmelden",
    language: "Sprache",
  },
  footer: {
    tagline:
      "Die ausgegebenen Token (ERC-1155) bilden zu Informationszwecken den Kurs börsennotierter Aktien ab. Sie sind weder eine Aktie noch ein Finanzinstrument noch ein Eigentumsrecht an einem börsennotierten Unternehmen und gewähren keine Dividenden- oder Stimmrechte.",
    informations: "Informationen",
    legal: "Impressum & AGB",
    risk: "Risikohinweis",
    privacy: "Datenschutz",
    support: "Hilfe & Support",
    account: "Konto",
    login: "Anmelden",
    portfolio: "Portfolio",
    orders: "Bestellungen",
    redeem: "Geschenk einlösen",
    copyright: "© 2026 TokenShares",
  },
  home: {
    pill: "Digitale Token, indexiert auf börsennotierte Aktien",
    h1: "Ein digitaler Token, indexiert auf eine börsennotierte Aktie.",
    subtitle:
      "Wählen Sie einen Wert aus dem S&P 500, CAC 40 oder Nikkei 225. Zahlen Sie im Testmodus, erhalten Sie einen Demo-Token in Ihrer Wallet und ein Andenken mit QR-Code nach Hause.",
    ctaAssets: "Werte entdecken",
    ctaRisks: "Risiken verstehen",
    steps: [
      {
        title: "1. Wählen Sie eine Aktie",
        text: "15 große internationale Werte. Simulierter Richtpreis, 10 % Marge vor der Zahlung angezeigt.",
      },
      {
        title: "2. Erhalten Sie Ihren Token",
        text: "Nach der Zahlung (Testmodus) wird ein ERC-1155-Demo-Token in einem Testnetzwerk direkt in Ihre Wallet ausgegeben.",
      },
      {
        title: "3. Behalten Sie die Kontrolle",
        text: "Non-Custodial-Wallet: Der private Schlüssel verlässt niemals Ihr Gerät. Ein sicherer QR-Code verbindet das physische Objekt mit Ihrer Bestellung.",
      },
    ],
    catalogTitle: "Ausgewählte Werte",
    catalogSubtitle: "Simulierte Richtpreise, laufend aktualisiert.",
    catalogAll: "Gesamter Katalog →",
    catalogEmptyBefore: "Der Katalog ist leer. Führen Sie",
    catalogEmptyAfter: "aus, um die Demodaten zu laden.",
    transparencyTitle: "Transparenz",
    transparencyText:
      "Der angezeigte Preis umfasst den simulierten Richtpreis des Werts zuzüglich einer Handelsmarge von 10 %. In dieser Demoversion wird keine echte Aktie gekauft, und der auf der Test-Blockchain ausgegebene Token ist weder eine Aktie noch ein Finanzinstrument noch ein Eigentumsrecht an einem börsennotierten Unternehmen.",
  },
};

export default de;
