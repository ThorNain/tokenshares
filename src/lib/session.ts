/**
 * Gestion des sessions côté serveur (cookies httpOnly signés).
 * Aucun mot de passe utilisateur n'est stocké : l'authentification client
 * passe par Privy (ou le mode démonstration), l'admin par variables d'env.
 */
import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export type { SessionPayload };

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload, env.sessionSecret);
  cookies().set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    // `Secure` dès que l'application est servie en HTTPS (toujours le cas en
    // production). Basé sur l'URL publique pour rester utilisable en local
    // avec `next start` sur http://localhost.
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token, env.sessionSecret);
}

export function destroySession(): void {
  cookies().delete(SESSION_COOKIE_NAME);
}

/** Session utilisateur requise — retourne null si non connecté (l'appelant décide). */
export async function requireUserSession(): Promise<SessionPayload | null> {
  return getSession();
}

/** Session administrateur requise. */
export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
