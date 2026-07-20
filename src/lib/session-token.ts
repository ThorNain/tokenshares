/**
 * Signature/vérification des jetons de session (JWT HS256 via jose).
 * Fichier compatible Edge Runtime : utilisé à la fois par le middleware
 * (protection des routes) et par session.ts (Node). N'importe ni Prisma ni
 * next/headers.
 */
import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "customer" | "admin";

export interface SessionPayload {
  userId: string;
  role: SessionRole;
  email: string;
}

export const SESSION_COOKIE_NAME = "ts_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600;

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload, secret: string): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      (payload.role !== "customer" && payload.role !== "admin")
    ) {
      return null;
    }
    return { userId: payload.userId, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}
