// Miner accounts + linked social handles (data layer).
//
// Email/password accounts, with passwords hashed using scrypt (built into Node —
// no extra dependency). The `handle` is the slug used in tracking links
// (/<handle>/<campaign>). Social handles are verified separately (see Phase 2).

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { sql } from "./db";

export type Miner = {
  id: number;
  handle: string;
  email: string;
  display_name: string | null;
  status: string;
  created_at: string;
};

export type Social = {
  id: number;
  miner_id: number;
  platform: "x" | "farcaster";
  handle: string;
  code: string;
  post_url: string | null;
  status: "pending" | "verified" | "rejected";
  verified_at: string | null;
};

// ---- password hashing (scrypt: salt:hash) ----

function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const dk = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${dk}`;
}

function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hex] = stored.split(":");
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const actual = scryptSync(pw, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Handles double as URL slugs, so keep them clean.
export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_-]{2,32}$/.test(handle);
}

export class SignupError extends Error {}

// ---- accounts ----

export async function createMiner(input: {
  handle: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<Miner> {
  const handle = input.handle.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  if (!isValidHandle(handle)) {
    throw new SignupError("Handle must be 2–32 chars: letters, numbers, - or _.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new SignupError("Enter a valid email address.");
  }
  if (input.password.length < 8) {
    throw new SignupError("Password must be at least 8 characters.");
  }

  try {
    const rows = await sql`
      INSERT INTO miners (handle, email, password_hash, display_name)
      VALUES (${handle}, ${email}, ${hashPassword(input.password)}, ${input.displayName || null})
      RETURNING id, handle, email, display_name, status, created_at
    `;
    return rows[0] as Miner;
  } catch (e: any) {
    // 23505 = unique_violation
    if (e?.code === "23505" || /duplicate key/i.test(e?.message || "")) {
      if (/handle/.test(e?.message || "")) throw new SignupError("That handle is taken.");
      throw new SignupError("An account with that email already exists.");
    }
    throw e;
  }
}

export async function authenticate(email: string, password: string): Promise<Miner | null> {
  const rows = await sql`
    SELECT id, handle, email, password_hash, display_name, status, created_at
    FROM miners WHERE email = ${email.trim().toLowerCase()}
  `;
  const row: any = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  delete row.password_hash;
  return row as Miner;
}

export async function getMinerById(id: number): Promise<Miner | null> {
  const rows = await sql`
    SELECT id, handle, email, display_name, status, created_at FROM miners WHERE id = ${id}
  `;
  return (rows[0] as Miner) || null;
}

export async function getSocials(minerId: number): Promise<Social[]> {
  const rows = await sql`
    SELECT id, miner_id, platform, handle, code, post_url, status, verified_at
    FROM miner_socials WHERE miner_id = ${minerId} ORDER BY platform
  `;
  return rows as any;
}
