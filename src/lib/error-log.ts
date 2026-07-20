/**
 * Journalisation structurée des erreurs par service (Privy, Stripe, base de
 * données, prix, courtier simulé, mint, blockchain, QR code, livraison).
 * Les messages ne contiennent jamais de secrets.
 */
import { prisma } from "@/lib/db";
import type { ErrorSeverity } from "@/lib/status";

export type ErrorService =
  | "privy"
  | "stripe"
  | "database"
  | "market-data"
  | "broker"
  | "mint"
  | "blockchain"
  | "qrcode"
  | "shipping"
  | "auth"
  | "app";

export async function logError(params: {
  service: ErrorService;
  type: string;
  severity?: ErrorSeverity;
  message: string;
  technicalMessage?: string;
  orderId?: string;
  userId?: string;
  attempts?: number;
}): Promise<void> {
  const severity = params.severity ?? "error";
  console.error(`[${params.service}] ${severity}: ${params.message}`);
  try {
    await prisma.errorLog.create({
      data: {
        service: params.service,
        type: params.type,
        severity,
        message: params.message,
        technicalMessage: params.technicalMessage ?? null,
        orderId: params.orderId ?? null,
        userId: params.userId ?? null,
        attempts: params.attempts ?? 0,
        lastAttemptAt: new Date(),
      },
    });
  } catch {
    // Ne jamais propager une erreur de journalisation.
    console.error("[error-log] impossible d'écrire dans ErrorLog");
  }
}

/** Message d'erreur sûr à partir d'une exception inconnue (sans stack complète). */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}
