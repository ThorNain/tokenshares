/**
 * Sélection du fournisseur blockchain :
 *  - "mock" (défaut) : simulation locale complète ;
 *  - "viem"          : vrai testnet EVM (Base Sepolia / Sepolia) si configuré.
 * En cas de configuration viem invalide, repli sûr sur la simulation avec
 * journalisation de l'erreur.
 */
import "server-only";
import { env } from "@/lib/env";
import type { BlockchainProvider } from "@/lib/providers/types";
import { MockBlockchainProvider } from "@/lib/providers/blockchain/mock";
import { ViemBlockchainProvider } from "@/lib/providers/blockchain/viem";

let instance: BlockchainProvider | null = null;

export function getBlockchainProvider(): BlockchainProvider {
  if (!instance) {
    if (env.blockchainProvider === "viem") {
      try {
        instance = new ViemBlockchainProvider();
      } catch (error) {
        console.error(
          "[blockchain] configuration viem invalide, repli sur la simulation :",
          error instanceof Error ? error.message : error,
        );
        instance = new MockBlockchainProvider(env.contractAddress);
      }
    } else {
      instance = new MockBlockchainProvider(env.contractAddress);
    }
  }
  return instance;
}

/** La chaîne est-elle réelle (liens explorateur valides) ? */
export function isRealChain(): boolean {
  return getBlockchainProvider().name === "viem";
}
