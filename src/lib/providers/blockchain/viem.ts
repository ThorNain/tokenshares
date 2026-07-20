/**
 * Fournisseur blockchain RÉEL (testnet EVM uniquement) via viem.
 * Réseaux supportés : Base Sepolia (84532, recommandé) et Ethereum Sepolia
 * (11155111). Le wallet « minter » (MINTER_PRIVATE_KEY) est un wallet
 * opérationnel de l'entreprise sur testnet — ce n'est JAMAIS une clé
 * d'utilisateur, et il ne doit détenir aucun fonds réel.
 */
import "server-only";
import { createPublicClient, createWalletClient, http, parseAbi, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, sepolia } from "viem/chains";
import { env } from "@/lib/env";
import type { BlockchainProvider, MintParams, MintResult } from "@/lib/providers/types";

const MINT_ABI = parseAbi([
  "function mint(address to, uint256 id, uint256 amount, bytes data) external",
]);

function resolveChain(chainId: number): Chain {
  if (chainId === 84532) return baseSepolia;
  if (chainId === 11155111) return sepolia;
  throw new Error(
    `CHAIN_ID ${chainId} non supporté. Utilisez 84532 (Base Sepolia) ou 11155111 (Sepolia).`,
  );
}

export class ViemBlockchainProvider implements BlockchainProvider {
  readonly name = "viem";
  readonly network: string;
  readonly contractAddress: string;
  readonly minterAddress: string;

  private readonly chain: Chain;
  private readonly account: ReturnType<typeof privateKeyToAccount>;
  private readonly rpcUrl: string;

  constructor() {
    const rpcUrl = env.rpcUrl;
    const contractAddress = process.env.TOKEN_CONTRACT_ADDRESS;
    const minterKey = env.minterPrivateKey;
    if (!rpcUrl || !contractAddress || !minterKey) {
      throw new Error(
        "Configuration blockchain incomplète : RPC_URL, TOKEN_CONTRACT_ADDRESS et MINTER_PRIVATE_KEY sont requis avec BLOCKCHAIN_PROVIDER=viem.",
      );
    }
    this.chain = resolveChain(env.chainId);
    this.rpcUrl = rpcUrl;
    this.contractAddress = contractAddress;
    this.account = privateKeyToAccount(minterKey as `0x${string}`);
    this.minterAddress = this.account.address;
    this.network = `${this.chain.name} (${this.chain.id})`;
  }

  async mintTo(params: MintParams): Promise<MintResult> {
    try {
      if (params.simulateFailure) {
        return { ok: false, error: "Échec simulé demandé (DEMO_FAIL_MINT_TICKERS)." };
      }
      const walletClient = createWalletClient({
        account: this.account,
        chain: this.chain,
        transport: http(this.rpcUrl),
      });
      const publicClient = createPublicClient({
        chain: this.chain,
        transport: http(this.rpcUrl),
      });

      const txHash = await walletClient.writeContract({
        address: this.contractAddress as `0x${string}`,
        abi: MINT_ABI,
        functionName: "mint",
        args: [
          params.toAddress as `0x${string}`,
          BigInt(params.tokenId),
          BigInt(params.quantity),
          "0x",
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
        timeout: 180_000,
      });

      const feeWei = receipt.gasUsed * receipt.effectiveGasPrice;
      if (receipt.status !== "success") {
        return {
          ok: false,
          txHash,
          blockNumber: Number(receipt.blockNumber),
          error: "La transaction a été rejetée (revert) par le contrat.",
        };
      }
      return {
        ok: true,
        txHash,
        blockNumber: Number(receipt.blockNumber),
        confirmations: 1,
        feeWei: feeWei.toString(),
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message.slice(0, 500) : "Erreur blockchain inconnue",
      };
    }
  }
}
