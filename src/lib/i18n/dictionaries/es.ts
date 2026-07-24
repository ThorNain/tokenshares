import type { Dictionary } from "@/lib/i18n/types";

const es: Dictionary = {
  nav: {
    assets: "Activos",
    risks: "Riesgos",
    admin: "Administración",
    myAccount: "Mi espacio",
    login: "Iniciar sesión",
    language: "Idioma",
  },
  footer: {
    tagline:
      "Los tokens emitidos (ERC-1155) están indexados, a título informativo, sobre la cotización de acciones cotizadas. No constituyen una acción, ni un instrumento financiero, ni un derecho de propiedad sobre una empresa cotizada, y no confieren ningún dividendo ni derecho de voto.",
    informations: "Información",
    legal: "Aviso legal y condiciones",
    risk: "Advertencia sobre los riesgos",
    privacy: "Privacidad",
    support: "Ayuda y soporte",
    account: "Cuenta",
    login: "Iniciar sesión",
    portfolio: "Cartera",
    orders: "Pedidos",
    redeem: "Canjear un regalo",
    copyright: "© 2026 TokenShares",
  },
  home: {
    pill: "Tokens digitales indexados sobre acciones cotizadas",
    h1: "Un token digital, indexado sobre una acción cotizada.",
    subtitle:
      "Elija un valor del S&P 500, del CAC 40 o del Nikkei 225. Pague en modo de prueba, reciba un token de demostración en su wallet y un objeto de recuerdo con código QR en su casa.",
    ctaAssets: "Descubrir los activos",
    ctaRisks: "Comprender los riesgos",
    steps: [
      {
        title: "1. Elija una acción",
        text: "15 grandes valores internacionales. Precio indicativo simulado, margen del 10 % mostrado antes del pago.",
      },
      {
        title: "2. Reciba su token",
        text: "Tras el pago (modo de prueba), se emite un token de demostración ERC-1155 en una red de prueba, directamente en su wallet.",
      },
      {
        title: "3. Mantenga el control",
        text: "Wallet no custodial: la clave privada nunca sale de su dispositivo. Un código QR seguro vincula el objeto físico con su pedido.",
      },
    ],
    catalogTitle: "Selección de activos",
    catalogSubtitle: "Precios indicativos simulados, actualizados continuamente.",
    catalogAll: "Todo el catálogo →",
    catalogEmptyBefore: "El catálogo está vacío. Ejecute",
    catalogEmptyAfter: "para cargar los datos de demostración.",
    transparencyTitle: "Transparencia",
    transparencyText:
      "El precio mostrado incluye el precio indicativo simulado del activo más un margen comercial del 10 %. En esta versión de demostración, no se compra ninguna acción real y el token emitido en la blockchain de prueba no constituye una acción, ni un instrumento financiero, ni un derecho de propiedad sobre una empresa cotizada.",
  },
};

export default es;
