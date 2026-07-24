import type { Dictionary } from "@/lib/i18n/types";

const en: Dictionary = {
  nav: {
    assets: "Assets",
    risks: "Risks",
    admin: "Administration",
    myAccount: "My account",
    login: "Sign in",
    language: "Language",
  },
  footer: {
    tagline:
      "The tokens issued (ERC-1155) are indexed, for information purposes, on the price of listed shares. They are neither a share, nor a financial instrument, nor an ownership right in a listed company, and confer no dividend or voting rights.",
    informations: "Information",
    legal: "Legal & Terms",
    risk: "Risk disclosure",
    privacy: "Privacy",
    support: "Help & support",
    account: "Account",
    login: "Sign in",
    portfolio: "Portfolio",
    orders: "Orders",
    redeem: "Redeem a gift",
    copyright: "© 2026 TokenShares",
  },
  home: {
    pill: "Digital tokens indexed on listed shares",
    h1: "A digital token, indexed on a listed share.",
    subtitle:
      "Pick a stock from the S&P 500, CAC 40 or Nikkei 225. Pay in test mode, receive a demo token in your wallet, and a keepsake with a QR code at home.",
    ctaAssets: "Explore the assets",
    ctaRisks: "Understand the risks",
    steps: [
      {
        title: "1. Choose a stock",
        text: "15 major international companies. Indicative simulated price, 10% margin shown before payment.",
      },
      {
        title: "2. Receive your token",
        text: "After payment (test mode), a demo ERC-1155 token is issued on a test network, directly into your wallet.",
      },
      {
        title: "3. Stay in control",
        text: "Non-custodial wallet: the private key never leaves your device. A secure QR code links the physical item to your order.",
      },
    ],
    catalogTitle: "Selected assets",
    catalogSubtitle: "Indicative simulated prices, updated continuously.",
    catalogAll: "Full catalogue →",
    catalogEmptyBefore: "The catalogue is empty. Run",
    catalogEmptyAfter: "to load the demo data.",
    transparencyTitle: "Transparency",
    transparencyText:
      "The displayed price includes the indicative simulated price of the asset plus a 10% commercial margin. In this demo version, no real share is purchased and the token issued on the test blockchain is neither a share, nor a financial instrument, nor an ownership right in a listed company.",
  },
};

export default en;
