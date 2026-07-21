/**
 * Vérification des jetons Privy CÔTÉ SERVEUR (@privy-io/server-auth).
 * Le serveur ne manipule jamais de clé privée : Privy gère l'embedded wallet
 * côté client, seule l'adresse publique et l'identifiant Privy sont stockés.
 */
import "server-only";
import { PrivyClient } from "@privy-io/server-auth";
import { env } from "@/lib/env";

let client: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient | null {
  if (!env.privyEnabled) return null;
  if (!client) {
    client = new PrivyClient(env.privyAppId as string, env.privyAppSecret as string);
  }
  return client;
}

export interface VerifiedPrivyUser {
  privyUserId: string;
  email: string | null;
  walletAddress: string | null;
}

/**
 * Vérifie un access token Privy et récupère l'utilisateur (email + adresse
 * du wallet embarqué). Retourne null si le token est invalide ou si Privy
 * n'est pas configuré.
 */
export async function verifyPrivyAccessToken(accessToken: string): Promise<VerifiedPrivyUser | null> {
  const privy = getPrivyClient();
  if (!privy) return null;
  try {
    const claims = await privy.verifyAuthToken(accessToken);
    const user = await privy.getUser(claims.userId);

    // Extraction défensive des comptes liés (structure stable du SDK Privy).
    let email: string | null = null;
    let walletAddress: string | null = null;
    const linked = (user as { linkedAccounts?: unknown }).linkedAccounts;
    if (Array.isArray(linked)) {
      for (const account of linked) {
        const a = account as { type?: string; address?: string; walletClientType?: string };
        if (a.type === "email" && typeof a.address === "string" && !email) {
          email = a.address;
        }
        if (
          a.type === "wallet" &&
          typeof a.address === "string" &&
          /^0x[0-9a-fA-F]{40}$/.test(a.address)
        ) {
          // Préférence pour l'embedded wallet Privy.
          if (!walletAddress || a.walletClientType === "privy") {
            walletAddress = a.address;
          }
        }
      }
    }
    return { privyUserId: claims.userId, email, walletAddress };
  } catch {
    return null;
  }
}
