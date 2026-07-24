/**
 * Forme d'un dictionnaire de traduction. Chaque langue doit fournir EXACTEMENT
 * ces clés (le compilateur refuse une langue incomplète). Portée actuelle :
 * navigation, pied de page, page d'accueil. À étendre page par page.
 */
export interface Dictionary {
  nav: {
    assets: string;
    risks: string;
    admin: string;
    myAccount: string;
    login: string;
    language: string;
  };
  footer: {
    tagline: string;
    informations: string;
    legal: string;
    risk: string;
    privacy: string;
    support: string;
    account: string;
    login: string;
    portfolio: string;
    orders: string;
    redeem: string;
    copyright: string;
  };
  home: {
    pill: string;
    h1: string;
    subtitle: string;
    ctaAssets: string;
    ctaRisks: string;
    steps: { title: string; text: string }[];
    catalogTitle: string;
    catalogSubtitle: string;
    catalogAll: string;
    catalogEmptyBefore: string;
    catalogEmptyAfter: string;
    transparencyTitle: string;
    transparencyText: string;
  };
}
