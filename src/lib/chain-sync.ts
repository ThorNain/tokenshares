/**
 * Indexeur on-chain : réconcilie la propriété applicative avec la vérité de la
 * blockchain lorsqu'un token est transféré HORS de la plateforme (Coinbase
 * Wallet, MetaMask…).
 *
 * Fonctionnement (incrémental, sans processus long — compatible serverless) :
 *  1. lit les événements TransferSingle / TransferBatch du contrat depuis le
 *     dernier bloc synchronisé (Setting `chain_last_synced_block`) ;
 *  2. enregistre chaque transfert (ChainTransfer) ;
 *  3. réconcilie : pour un transfert entre deux adresses, si l'expéditeur est
 *     un utilisateur connu, la/les commande(s) correspondante(s) sont soit
 *     RÉATTRIBUÉES au destinataire (s'il est lui aussi un compte connu), soit
 *     marquées « transférées hors plateforme ».
 *
 * Limite assumée (fongibilité) : les tokens d'un même actif étant
 * interchangeables, quand un utilisateur détient plusieurs commandes du même
 * actif, on impute le transfert aux plus anciennes d'abord (FIFO).
 */
import "server-only";
import { createPublicClient, http, parseAbiItem, getAddress, type Chain } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getBlockchainProvider } from "@/lib/providers/blockchain";
import { audit, SYSTEM_ACTOR, type Actor } from "@/lib/audit";
import { logError, safeErrorMessage } from "@/lib/error-log";
import { TOKEN_HELD_STATUSES } from "@/lib/portfolio";

const ZERO = "0x0000000000000000000000000000000000000000";
const LAST_BLOCK_KEY = "chain_last_synced_block";
const CHUNK = 3000; // taille de fenêtre getLogs (limites RPC publiques)
const MAX_CHUNKS = 20; // borne le travail d'une exécution (≈ 60 000 blocs)

const TRANSFER_SINGLE = parseAbiItem(
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
);
const TRANSFER_BATCH = parseAbiItem(
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
);

export interface ChainSyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  initialized?: boolean;
  fromBlock?: number;
  toBlock?: number;
  eventsIndexed?: number;
  reconciled?: number;
  error?: string;
}

function resolveChain(chainId: number): Chain {
  if (chainId === 11155111) return sepolia;
  return baseSepolia;
}

/**
 * Sélectionne, en FIFO, les commandes « soldées » par un transfert d'une
 * quantité donnée. Fonction PURE (testée) : une commande n'est retenue que si
 * la quantité restante du transfert couvre entièrement sa quantité (pas de
 * transfert partiel d'une commande, volontairement, pour rester déterministe).
 */
export function selectOrdersToTransfer(
  orders: { id: string; quantity: number }[],
  amount: number,
): { orderIds: string[]; remaining: number } {
  let remaining = amount;
  const orderIds: string[] = [];
  for (const order of orders) {
    if (remaining <= 0) break;
    // Glouton : on saute une commande trop grande pour la quantité restante
    // mais on continue à balayer (une commande plus petite peut correspondre).
    if (order.quantity > 0 && remaining >= order.quantity) {
      orderIds.push(order.id);
      remaining -= order.quantity;
    }
  }
  return { orderIds, remaining };
}

async function getLastSyncedBlock(): Promise<number | null> {
  const row = await prisma.setting.findUnique({ where: { key: LAST_BLOCK_KEY } });
  if (!row) return null;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : null;
}

async function setLastSyncedBlock(block: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: LAST_BLOCK_KEY },
    create: { key: LAST_BLOCK_KEY, value: String(block) },
    update: { value: String(block) },
  });
}

/** Synchronise les transferts on-chain et réconcilie la propriété applicative. */
export async function syncChainTransfers(actor: Actor = SYSTEM_ACTOR): Promise<ChainSyncResult> {
  const chainProvider = getBlockchainProvider();
  if (chainProvider.name !== "viem") {
    return { ok: true, skipped: true, reason: "Blockchain simulée (BLOCKCHAIN_PROVIDER=mock)." };
  }
  if (!env.rpcUrl) {
    return { ok: false, error: "RPC_URL manquant." };
  }

  const chain = resolveChain(env.chainId);
  const contract = getAddress(env.contractAddress);
  const client = createPublicClient({ chain, transport: http(env.rpcUrl) });

  try {
    const latest = Number(await client.getBlockNumber());
    const last = await getLastSyncedBlock();

    // Première exécution : on démarre la surveillance à partir de maintenant
    // (les transferts antérieurs à l'activation ne sont pas rétro-indexés).
    if (last === null) {
      await setLastSyncedBlock(latest);
      return { ok: true, initialized: true, fromBlock: latest, toBlock: latest, eventsIndexed: 0 };
    }

    if (last >= latest) {
      return { ok: true, fromBlock: last + 1, toBlock: latest, eventsIndexed: 0, reconciled: 0 };
    }

    const fromBlock = last + 1;
    const toBlock = Math.min(latest, fromBlock + CHUNK * MAX_CHUNKS - 1);
    let eventsIndexed = 0;

    for (let start = fromBlock; start <= toBlock; start += CHUNK) {
      const end = Math.min(toBlock, start + CHUNK - 1);
      const [singles, batches] = await Promise.all([
        client.getLogs({ address: contract, event: TRANSFER_SINGLE, fromBlock: BigInt(start), toBlock: BigInt(end) }),
        client.getLogs({ address: contract, event: TRANSFER_BATCH, fromBlock: BigInt(start), toBlock: BigInt(end) }),
      ]);

      type Row = {
        txHash: string;
        logIndex: number;
        blockNumber: number;
        from: string;
        to: string;
        tokenId: number;
        amount: number;
      };
      const rows: Row[] = [];
      for (const log of singles) {
        const a = log.args;
        if (!a.from || !a.to || a.id === undefined || a.value === undefined) continue;
        rows.push({
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          blockNumber: Number(log.blockNumber),
          from: getAddress(a.from),
          to: getAddress(a.to),
          tokenId: Number(a.id),
          amount: Number(a.value),
        });
      }
      for (const log of batches) {
        const a = log.args;
        if (!a.from || !a.to || !a.ids || !a.values) continue;
        a.ids.forEach((id, i) => {
          rows.push({
            txHash: log.transactionHash,
            logIndex: log.logIndex,
            blockNumber: Number(log.blockNumber),
            from: getAddress(a.from as string),
            to: getAddress(a.to as string),
            tokenId: Number(id),
            amount: Number((a.values as readonly bigint[])[i] ?? 0n),
          });
        });
      }

      for (const r of rows) {
        const kind = r.from === ZERO ? "mint" : r.to === ZERO ? "burn" : "transfer";
        try {
          await prisma.chainTransfer.create({
            data: {
              network: chainProvider.network,
              txHash: r.txHash,
              logIndex: r.logIndex,
              blockNumber: r.blockNumber,
              kind,
              fromAddress: r.from,
              toAddress: r.to,
              tokenId: r.tokenId,
              amount: r.amount,
              // mint/burn = déjà gérés par la plateforme → rien à réconcilier.
              processed: kind !== "transfer",
              processedAt: kind !== "transfer" ? new Date() : null,
            },
          });
          eventsIndexed += 1;
        } catch {
          // Violation d'unicité = événement déjà indexé (idempotent).
        }
      }
    }

    await setLastSyncedBlock(toBlock);
    const reconciled = await reconcilePendingTransfers(actor);

    return { ok: true, fromBlock, toBlock, eventsIndexed, reconciled };
  } catch (error) {
    await logError({
      service: "blockchain",
      type: "chain_sync_failed",
      severity: "error",
      message: "Échec de la synchronisation on-chain.",
      technicalMessage: safeErrorMessage(error),
    });
    return { ok: false, error: safeErrorMessage(error) };
  }
}

/** Réconcilie les transferts « externes » non encore traités. */
export async function reconcilePendingTransfers(actor: Actor = SYSTEM_ACTOR): Promise<number> {
  const pending = await prisma.chainTransfer.findMany({
    where: { kind: "transfer", processed: false },
    orderBy: { blockNumber: "asc" },
    take: 200,
  });

  let reconciled = 0;
  for (const transfer of pending) {
    try {
      await reconcileOne(transfer, actor);
      reconciled += 1;
    } catch (error) {
      await logError({
        service: "blockchain",
        type: "chain_reconcile_failed",
        severity: "warning",
        message: `Réconciliation impossible pour le transfert ${transfer.txHash}.`,
        technicalMessage: safeErrorMessage(error),
      });
    }
  }
  return reconciled;
}

async function reconcileOne(
  transfer: { id: string; fromAddress: string; toAddress: string; tokenId: number; amount: number },
  actor: Actor,
): Promise<void> {
  const [fromWallet, toWallet] = await Promise.all([
    prisma.wallet.findFirst({ where: { address: transfer.fromAddress, chainId: env.chainId } }),
    prisma.wallet.findFirst({ where: { address: transfer.toAddress, chainId: env.chainId } }),
  ]);

  // L'expéditeur n'est pas un compte connu : rien à réconcilier côté app.
  if (!fromWallet) {
    await markProcessed(transfer.id, "Expéditeur inconnu de la plateforme.");
    return;
  }

  // Commandes de l'expéditeur, sur cet actif, encore détenues (FIFO).
  const heldOrders = await prisma.order.findMany({
    where: {
      userId: fromWallet.userId,
      status: { in: TOKEN_HELD_STATUSES },
      transferredOffchain: false,
      tokenMint: { status: "transfer_confirmed" },
      items: { some: { asset: { tokenId: transfer.tokenId } } },
    },
    orderBy: { createdAt: "asc" },
    include: { items: { include: { asset: true } } },
  });

  const candidates = heldOrders
    .filter((o) => o.items.some((it) => it.asset.tokenId === transfer.tokenId))
    .map((o) => ({ id: o.id, quantity: o.items.reduce((s, it) => s + it.quantity, 0) }));

  const { orderIds } = selectOrdersToTransfer(candidates, transfer.amount);

  if (orderIds.length === 0) {
    await markProcessed(
      transfer.id,
      "Aucune commande détenue à imputer (quantité partielle ou déjà transférée).",
    );
    return;
  }

  const now = new Date();
  for (const orderId of orderIds) {
    if (toWallet) {
      // Destinataire connu → réattribution (le certificat suit `userId`).
      await prisma.order.update({
        where: { id: orderId },
        data: { userId: toWallet.userId, transferredAt: now, needsReview: true },
      });
      await audit(
        {
          actor,
          action: "order_transferred_onchain",
          entityType: "Order",
          entityId: orderId,
          orderId,
          oldValue: fromWallet.userId,
          newValue: toWallet.userId,
          justification: `Transfert on-chain détecté (${transfer.fromAddress} → ${transfer.toAddress}).`,
        },
      );
    } else {
      // Destinataire hors plateforme → commande retirée du portefeuille vendeur.
      await prisma.order.update({
        where: { id: orderId },
        data: {
          transferredOffchain: true,
          transferredToAddress: transfer.toAddress,
          transferredAt: now,
        },
      });
      await audit({
        actor,
        action: "order_transferred_offchain",
        entityType: "Order",
        entityId: orderId,
        orderId,
        justification: `Transfert on-chain vers une adresse externe (${transfer.toAddress}).`,
      });
    }
  }

  await markProcessed(transfer.id, `${orderIds.length} commande(s) réconciliée(s).`);
}

async function markProcessed(id: string, note: string): Promise<void> {
  await prisma.chainTransfer.update({
    where: { id },
    data: { processed: true, processedAt: new Date(), note },
  });
}
