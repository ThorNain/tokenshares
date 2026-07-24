import type { Dictionary } from "@/lib/i18n/types";

const fr: Dictionary = {
  nav: {
    assets: "Actifs",
    risks: "Risques",
    admin: "Administration",
    myAccount: "Mon espace",
    login: "Se connecter",
    language: "Langue",
  },
  footer: {
    tagline:
      "Les tokens émis (ERC-1155) sont indexés à titre informatif sur le cours d'actions cotées. Ils ne constituent ni une action, ni un instrument financier, ni un droit de propriété sur une entreprise cotée, et ne confèrent aucun dividende ni droit de vote.",
    informations: "Informations",
    legal: "Mentions & CGU",
    risk: "Avertissement sur les risques",
    privacy: "Confidentialité",
    support: "Aide & support",
    account: "Compte",
    login: "Connexion",
    portfolio: "Portefeuille",
    orders: "Commandes",
    redeem: "Réclamer un cadeau",
    copyright: "© 2026 TokenShares",
  },
  home: {
    pill: "Tokens numériques indexés sur des actions cotées",
    h1: "Un token numérique, indexé sur une action cotée.",
    subtitle:
      "Choisissez une valeur du S&P 500, du CAC 40 ou du Nikkei 225. Payez en mode test, recevez un token de démonstration dans votre wallet, et un objet souvenir avec QR code chez vous.",
    ctaAssets: "Découvrir les actifs",
    ctaRisks: "Comprendre les risques",
    steps: [
      {
        title: "1. Choisissez une action",
        text: "15 grandes valeurs internationales. Prix indicatif simulé, marge de 10 % affichée avant paiement.",
      },
      {
        title: "2. Recevez votre token",
        text: "Après paiement (mode test), un token de démonstration ERC-1155 est émis sur un réseau d'essai, directement dans votre wallet.",
      },
      {
        title: "3. Gardez le contrôle",
        text: "Wallet non-custodial : la clé privée ne quitte jamais votre appareil. Un QR code sécurisé relie l'objet physique à votre commande.",
      },
    ],
    catalogTitle: "Sélection d'actifs",
    catalogSubtitle: "Prix indicatifs simulés, actualisés en continu.",
    catalogAll: "Tout le catalogue →",
    catalogEmptyBefore: "Le catalogue est vide. Exécutez",
    catalogEmptyAfter: "pour charger les données de démonstration.",
    transparencyTitle: "Transparence",
    transparencyText:
      "Le prix affiché comprend le prix indicatif de l'actif simulé ainsi qu'une marge commerciale de 10 %. Dans cette version de démonstration, aucune action réelle n'est achetée et le token émis sur la blockchain de test ne constitue ni une action, ni un instrument financier, ni un droit de propriété sur une entreprise cotée.",
  },
};

export default fr;
