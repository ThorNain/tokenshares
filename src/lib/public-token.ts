/**
 * Génération d'identifiants publics : jetons de QR code, identifiants de
 * commande lisibles, adresses de démonstration, faux hash de transaction.
 * Utilise exclusivement le CSPRNG de Node (crypto) — aucun système
 * cryptographique « maison ».
 */
import { createHash, randomBytes } from "node:crypto";

/**
 * Jeton public opaque (128 bits, base64url). Ne contient AUCUNE donnée :
 * ni clé privée, ni donnée personnelle, ni session. Conservé pour usages
 * internes divers (clés d'idempotence, etc.).
 */
export function generatePublicToken(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Code court et lisible pour le lien du QR code physique (URL /p/{code}),
 * ex. AB7X92. Alphabet sans ambiguïté (pas de O/0/I/1). L'indirection est
 * volontaire : le QR ne pointe QUE vers notre page — jamais vers le wallet ni
 * la clé — ce qui permet de le désactiver, de changer de fournisseur de wallet
 * ou de modifier le comportement plus tard sans réimprimer les objets.
 *
 * Longueur par défaut 8 → 32^8 ≈ 1 000 milliards de combinaisons, ce qui rend
 * l'énumération impraticable tout en gardant un code compact. L'unicité est
 * garantie par la contrainte en base (avec ré-essai en cas de collision).
 */
export function generateClaimCode(length = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[(bytes[i] as number) % alphabet.length];
  }
  return out;
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
