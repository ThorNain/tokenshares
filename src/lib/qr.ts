/**
 * Génération des QR codes de commande (PNG + SVG).
 * Le QR code encode UNIQUEMENT l'URL publique /claim/{token} — jamais de clé
 * privée, seed phrase, mot de passe, session ni donnée personnelle.
 */
import QRCode from "qrcode";
import { env } from "@/lib/env";

export function claimUrl(publicToken: string): string {
  return `${env.appUrl}/claim/${publicToken}`;
}

const QR_OPTIONS = {
  margin: 2,
  width: 512,
  color: { dark: "#0d1b2a", light: "#ffffff" },
} as const;

export async function qrPngDataUrl(publicToken: string): Promise<string> {
  return QRCode.toDataURL(claimUrl(publicToken), QR_OPTIONS);
}

export async function qrPngBuffer(publicToken: string): Promise<Buffer> {
  return QRCode.toBuffer(claimUrl(publicToken), { ...QR_OPTIONS, type: "png" });
}

export async function qrSvg(publicToken: string): Promise<string> {
  return QRCode.toString(claimUrl(publicToken), { type: "svg", margin: 2, color: QR_OPTIONS.color });
}
