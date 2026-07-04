// Miner accounts + linked social handles (data layer).
//
// Email/password accounts, with passwords hashed using scrypt (built into Node —
// no extra dependency). The `handle` is the slug used in tracking links
// (/<handle>/<campaign>). Social handles are verified separately (see Phase 2).

import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { sql } from "./db";
import { isValidBittensorAddress } from "./wallet";

export type Miner = {
  id: number;
  handle: string;
  email: string;
  display_name: string | null;
  hotkey: string | null; // Bittensor SS58 payout address
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
  hotkey?: string; // optional at signup — collected after, on the dashboard
  displayName?: string;
}): Promise<Miner> {
  const handle = input.handle.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const hotkey = (input.hotkey || "").trim();

  if (!isValidHandle(handle)) {
    throw new SignupError("Handle must be 2–32 chars: letters, numbers, - or _.");
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new SignupError("Enter a valid email address.");
  }
  if (input.password.length < 8) {
    throw new SignupError("Password must be at least 8 characters.");
  }
  // If a hotkey is supplied here, format-check it (off-chain, see lib/wallet.ts).
  // Otherwise it's collected later on the dashboard (setHotkey).
  if (hotkey && !isValidBittensorAddress(hotkey)) {
    throw new SignupError(
      "Enter a valid Bittensor hotkey — it starts with “5” and is about 48 characters."
    );
  }

  try {
    const rows = await sql`
      INSERT INTO miners (handle, email, password_hash, display_name, hotkey)
      VALUES (${handle}, ${email}, ${hashPassword(input.password)}, ${input.displayName || null}, ${hotkey || null})
      RETURNING id, handle, email, display_name, hotkey, status, created_at
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
    SELECT id, handle, email, password_hash, display_name, hotkey, status, created_at
    FROM miners WHERE email = ${email.trim().toLowerCase()}
  `;
  const row: any = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) return null;
  delete row.password_hash;
  return row as Miner;
}

export async function getMinerById(id: number): Promise<Miner | null> {
  const rows = await sql`
    SELECT id, handle, email, display_name, hotkey, status, created_at FROM miners WHERE id = ${id}
  `;
  return (rows[0] as Miner) || null;
}

export async function getMinerByHandle(handle: string): Promise<Miner | null> {
  const rows = await sql`
    SELECT id, handle, email, display_name, hotkey, status, created_at
    FROM miners WHERE handle = ${handle.trim().toLowerCase()}
  `;
  return (rows[0] as Miner) || null;
}

export type MinerListRow = Miner & { clicks: number; verified_socials: number };

// All registered miner accounts, with quick aggregates for the admin list.
export async function listMiners(): Promise<MinerListRow[]> {
  const rows = await sql`
    SELECT m.id, m.handle, m.email, m.display_name, m.hotkey, m.status, m.created_at,
      (SELECT count(*)::int FROM clicks c WHERE c.miner = m.handle) AS clicks,
      (SELECT count(*)::int FROM miner_socials s
         WHERE s.miner_id = m.id AND s.status = 'verified') AS verified_socials
    FROM miners m
    ORDER BY clicks DESC, m.created_at DESC
  `;
  return rows as any;
}

export async function getSocials(minerId: number): Promise<Social[]> {
  const rows = await sql`
    SELECT id, miner_id, platform, handle, code, post_url, status, verified_at
    FROM miner_socials WHERE miner_id = ${minerId} ORDER BY platform
  `;
  return rows as any;
}

// Update a miner's payout hotkey (validated, format-only). Used from the miner
// dashboard so existing accounts (and anyone changing keys) can set it.
export async function setHotkey(minerId: number, hotkey: string): Promise<void> {
  const hk = hotkey.trim();
  if (!isValidBittensorAddress(hk)) {
    throw new SignupError(
      "Enter a valid Bittensor hotkey — it starts with “5” and is about 48 characters."
    );
  }
  await sql`UPDATE miners SET hotkey = ${hk} WHERE id = ${minerId}`;
}

// handle → hotkey (nullable). Lets the validator feed map each miner's clicks to
// the payout address without exposing anything else about the account.
export async function hotkeysByHandle(): Promise<Record<string, string | null>> {
  const rows = await sql`SELECT handle, hotkey FROM miners`;
  const out: Record<string, string | null> = {};
  for (const r of rows as any[]) out[r.handle] = r.hotkey ?? null;
  return out;
}
