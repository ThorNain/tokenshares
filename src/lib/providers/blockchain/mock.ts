/**
 * Blockchain SIMULÉE : produit des hash de transaction et numéros de bloc
 * fictifs, sans aucune dépendance réseau. Permet de tester tout le pipeline
 * (mint, confirmations, erreurs, relances) en local.
 */
import { fakeTxHash } from "@/lib/public-token";
import type {
  BlockchainProvider,
  MintParams,
  MintResult,
  BurnParams,
  BurnResult,
} from "@/lib/providers/types";

/** Numéro de bloc fictif croissant (≈ un bloc toutes les 2 s, base arbitraire). */
function simulatedBlockNumber(): number {
  const GENESIS_MS = 1_700_000_000_000;
  return 10_000_000 + Math.floor((Date.now() - GENESIS_MS) / 2000);
}

export class MockBlockchainProvider implements BlockchainProvider {
  readonly name = "mock";
  readonly network = "mock-testnet (simulation locale)";
  readonly contractAddress: string;
  readonly minterAddress = "0x000000000000000000000000000000000000dEaD";

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
  }

  async mintTo(params: MintParams): Promise<MintResult> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(params.toAddress)) {
      return { ok: false, error: `Adresse de destination invalide : ${params.toAddress}` };
    }
    if (!Number.isInteger(params.quantity) || params.quantity < 1) {
      return { ok: false, error: `Quantité invalide : ${params.quantity}` };
    }
    // Latence simulée de soumission + confirmation.
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (params.simulateFailure) {
      return {
        ok: false,
        error:
          "Erreur RPC simulée : insufficient funds for gas (simulation d'échec pour test de relance)",
      };
    }

    return {
      ok: true,
      txHash: fakeTxHash(),
      blockNumber: simulatedBlockNumber(),
      confirmations: 12,
      feeWei: "31500000000000", // ~21 000 gas × 1,5 gwei (fictif)
    };
  }

  async burnFrom(params: BurnParams): Promise<BurnResult> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(params.fromAddress)) {
      return { ok: false, error: `Adresse source invalide : ${params.fromAddress}` };
    }
    if (!Number.isInteger(params.quantity) || params.quantity < 1) {
      return { ok: false, error: `Quantité invalide : ${params.quantity}` };
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (params.simulateFailure) {
      return {
        ok: false,
        error: "Erreur RPC simulée : burn reverted (simulation d'échec pour test de relance)",
      };
    }

    return {
      ok: true,
      txHash: fakeTxHash(),
      blockNumber: simulatedBlockNumber(),
      confirmations: 12,
      feeWei: "28000000000000",
    };
  }
}
