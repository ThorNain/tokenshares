/**
 * Génération d'identifiants publics : jetons de QR code, identifiants de
 * commande lisibles, adresses de démonstration, faux hash de transaction.
 * Utilise exclusivement le CSPRNG de Node (crypto) — aucun système
 * cryptographique « maison ».
 */
import { createHash, randomBytes } from "node:crypto";

/**
 * Jeton public d'une commande (URL /claim/{token}).
 * 128 bits d'entropie, encodage base64url. Ne contient AUCUNE donnée :
 * ni clé privée, ni donnée personnelle, ni session.
 */
export function generatePublicToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Identifiant de commande lisible, ex. ORD-8F3K2A (alphabet sans ambiguïtés). */
export function generateOrderPublicId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[(bytes[i] as number) % alphabet.length];
  }
  return `ORD-${out}`;
}

/**
 * Adresse EVM fictive et déterministe pour le mode démonstration (dérivée de
 * l'email par hachage). Ce n'est PAS un vrai wallet : aucune clé privée
 * n'existe pour cette adresse.
 */
export function demoWalletAddress(seed: string): string {
  return "0x" + createHash("sha256").update(`demo-wallet:${seed}`).digest("hex").slice(0, 40);
}

/** Hash de transaction fictif (blockchain simulée). */
export function fakeTxHash(): string {
  return "0x" + randomBytes(32).toString("hex");
}

/** Référence courte pour opérations simulées (courtier, remboursements…). */
export function simulatedRef(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString("hex").toUpperCase()}`;
}
