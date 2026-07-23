/**
 * Accès centralisé aux variables d'environnement CÔTÉ SERVEUR.
 * Ne jamais importer ce fichier depuis un composant client : les secrets ne
 * doivent jamais atteindre le frontend. Les composants client utilisent
 * uniquement les variables NEXT_PUBLIC_*.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get sessionSecret(): string {
    const v = process.env.SESSION_SECRET;
    if (v) return v;
    // Repli en clair UNIQUEMENT en dev local. Sur tout autre environnement
    // (staging/preview) sans SESSION_SECRET, on refuse : sinon le secret public
    // (présent dans les sources) permettrait de forger un cookie admin.
    if (process.env.NODE_ENV === "production") return required("SESSION_SECRET", v);
    return "dev-only-secret-change-me-4f8a2c1e9b7d6035";
  },
  /** Mode démonstration : active les simulations manuelles dans l'admin. */
  get demoMode(): boolean {
    // Verrou de sécurité : jamais actif en production, même si la variable
    // est définie par erreur (section 28 du cahier des charges).
    if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
      return false;
    }
    return process.env.DEMO_MODE === "true";
  },

  // --- Admin ---
  get adminEmail(): string {
    return process.env.ADMIN_EMAIL ?? "admin@example.test";
  },
  get adminPassword(): string | undefined {
    return process.env.ADMIN_PASSWORD;
  },

  // --- Privy ---
  get privyAppId(): string | undefined {
    return process.env.NEXT_PUBLIC_PRIVY_APP_ID || undefined;
  },
  get privyAppSecret(): string | undefined {
    return process.env.PRIVY_APP_SECRET || undefined;
  },
  get privyEnabled(): boolean {
    return Boolean(this.privyAppId && this.privyAppSecret);
  },

  // --- Stripe (mode test uniquement) ---
  get stripeSecretKey(): string | undefined {
    return process.env.STRIPE_SECRET_KEY || undefined;
  },
  get stripeWebhookSecret(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET || undefined;
  },
  get stripeEnabled(): boolean {
    return Boolean(this.stripeSecretKey);
  },

  // --- Blockchain ---
  get blockchainProvider(): "mock" | "viem" {
    return process.env.BLOCKCHAIN_PROVIDER === "viem" ? "viem" : "mock";
  },
  get rpcUrl(): string | undefined {
    return process.env.RPC_URL || undefined;
  },
  get chainId(): number {
    return Number(process.env.CHAIN_ID ?? "84532");
  },
  get chainName(): string {
    return process.env.NEXT_PUBLIC_CHAIN_NAME ?? "Base Sepolia";
  },
  get contractAddress(): string {
    // Adresse fictive documentée en mode mock.
    return process.env.TOKEN_CONTRACT_ADDRESS || "0xDEM0000000000000000000000000000000000000";
  },
  get minterPrivateKey(): string | undefined {
    return process.env.MINTER_PRIVATE_KEY || undefined;
  },
  get explorerUrl(): string {
    return process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL ?? "https://sepolia.basescan.org";
  },

  /** Tickers dont le mint échoue volontairement (tests d'échec + relance). */
  get failMintTickers(): string[] {
    return (process.env.DEMO_FAIL_MINT_TICKERS ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  },
};
