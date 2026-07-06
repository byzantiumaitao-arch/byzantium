// Session management — signed cookie, no server-side session store.
//
// Two kinds of session:
//   - miner: a logged-in miner account (carries minerId); see lib/miners.ts
//   - admin: the operator, gated by a shared ADMIN_PASSWORD
//
//   AUTH_SECRET    – HMAC key that signs the session cookie
//   ADMIN_PASSWORD – unlocks the admin dashboard
//
// Dev fallbacks let it run locally with zero setup; ALWAYS set real values in
// Vercel for production.

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import crypto from "crypto";

const COOKIE = "byz_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";

export type Session =
  | { kind: "miner"; minerId: number }
  | { kind: "admin" };

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function makeToken(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function readToken(token: string): Session | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
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

// True if the request is the operator — a logged-in admin session, OR an
// x-admin-key header matching ADMIN_PASSWORD (for server-to-server tooling like
// the api-monitor). Used to gate the raw feed and to let admins bypass the
// public reveal delay for a real-time preview.
export function isAdminRequest(req: NextRequest): boolean {
  if (getSession()?.kind === "admin") return true;
  const key = req.headers.get("x-admin-key");
  return !!key && checkAdminPassword(key);
}
