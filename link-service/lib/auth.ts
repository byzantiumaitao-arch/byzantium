// Minimal password gate for the miner & admin dashboards.
//
// This is intentionally simple: a shared password per role (from env vars), and
// a signed cookie so a login sticks. No user database yet. Good enough to keep
// the dashboards private; swap in per-miner credentials when clicks move to a DB.
//
//   ADMIN_PASSWORD   – unlocks /admin (all clicks, all miners, campaigns)
//   MINER_PASSWORD   – unlocks /m for any miner handle (they pick their handle)
//   AUTH_SECRET      – HMAC key that signs the session cookie
//
// Dev fallbacks let it run locally with zero setup; ALWAYS set real values in
// Vercel for production (see SYSTEM.md).

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "byz_session";
const MAX_AGE = 60 * 60 * 12; // 12h

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const MINER_PASSWORD = process.env.MINER_PASSWORD || "miner";
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

export type Role = "admin" | "miner";
export type Session = { role: Role; miner?: string };

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

// token = base64url(json).signature  — tamper-evident, not encrypted.
function makeToken(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function readToken(token: string): Session | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  // Constant-time compare to avoid leaking the signature byte-by-byte.
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

// Check a submitted password for a role. Returns the session to store, or null.
export function checkPassword(role: Role, password: string, miner?: string): Session | null {
  if (role === "admin" && password === ADMIN_PASSWORD) return { role: "admin" };
  if (role === "miner" && password === MINER_PASSWORD && miner) {
    return { role: "miner", miner: miner.trim().toLowerCase() };
  }
  return null;
}

export function startSession(session: Session): void {
  cookies().set(COOKIE, makeToken(session), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function endSession(): void {
  cookies().delete(COOKIE);
}

export function getSession(): Session | null {
  const c = cookies().get(COOKIE)?.value;
  return c ? readToken(c) : null;
}
