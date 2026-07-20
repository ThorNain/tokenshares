/**
 * Limitation de débit en mémoire (fenêtre glissante) pour les routes
 * sensibles : connexion, création de commande, paiement.
 * Suffisant pour un prototype mono-instance ; à remplacer par Upstash/Redis
 * en production multi-instances (voir checklist du README).
 */
import { NextResponse } from "next/server";

const buckets = new Map<string, number[]>();

function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]!.trim() : "local";
  return `${scope}:${ip}`;
}

/**
 * Retourne une réponse 429 si la limite est dépassée, sinon null.
 * Usage : const limited = rateLimit(req, "login", 10, 60_000); if (limited) return limited;
 */
export function rateLimit(
  request: Request,
  scope: string,
  maxRequests: number,
  windowMs: number,
): NextResponse | null {
  const key = clientKey(request, scope);
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= maxRequests) {
    return NextResponse.json(
      { error: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
      { status: 429 },
    );
  }
  timestamps.push(now);
  buckets.set(key, timestamps);
  // Nettoyage opportuniste pour éviter la croissance illimitée.
  if (buckets.size > 10_000) buckets.clear();
  return null;
}
