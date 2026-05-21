// ---------------------------------------------------------------------------
// Lightweight session auth.
//
// On login we issue a signed cookie:   `${payload}.${hmac(payload)}`
// where payload is base64url("username|expiry-unix-ms").
//
// HMAC uses SESSION_SECRET from .env.local, falling back to a baked-in dev
// secret (DON'T do that in production).
//
// This avoids any extra dependencies (no iron-session, no JWT lib) which
// keeps the install footprint small and Windows-friendly.
// ---------------------------------------------------------------------------

import crypto from "crypto";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/constants";

export { COOKIE_NAME };
const SESSION_TTL_MS    = 1000 * 60 * 60 * 8; // 8 hours

function secret() {
  return process.env.SESSION_SECRET ?? "DEV-ONLY-CHANGE-ME-IN-PRODUCTION-PLEASE";
}

function base64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Create a signed session token. */
export function makeToken(username: string): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = base64url(`${username}|${expires}`);
  const sig     = hmac(payload);
  return `${payload}.${sig}`;
}

/**
 * Verify a token and return the username if valid, otherwise null.
 * Uses timing-safe comparison so a leaky string compare can't be brute-forced.
 */
export function verifyToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expectedSig = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const decoded = Buffer.from(payload, "base64url").toString();
  const [username, expiresRaw] = decoded.split("|");
  const expires = Number(expiresRaw);
  if (!username || !Number.isFinite(expires) || Date.now() > expires) return null;
  return username;
}

/** Server-side helper for route handlers / server components. */
export async function currentUser(): Promise<string | null> {
  const c = await cookies();
  return verifyToken(c.get(COOKIE_NAME)?.value);
}

/** Check a username/password pair against env-configured admin. */
export function checkCredentials(username: string, password: string): boolean {
  const u = process.env.ADMIN_USER ?? "admin";
  const p = process.env.ADMIN_PASS ?? "admin123";
  return username === u && password === p;
}
