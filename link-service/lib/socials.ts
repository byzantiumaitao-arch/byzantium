// Social handle verification by proof-of-post (no paid X API).
//
// Flow: miner enters their handle -> we store a pending row with a unique code ->
// miner posts that code on X/Farcaster and pastes the post URL back -> we verify.
//
// Verification has two checks:
//   1. URL ↔ handle: the post URL's author segment must equal the claimed handle
//      (x.com/<handle>/status/..., warpcast.com/<handle>/0x...). Always enforced.
//   2. Code in post: best-effort fetch of the post text to confirm the code.
//      X uses the public oEmbed endpoint. If the fetch can't confirm (API blocked,
//      Farcaster, etc.) the row stays 'pending' for the admin to approve manually.

import { randomBytes } from "crypto";
import { sql } from "./db";
import type { Social } from "./miners";

export type Platform = "x" | "farcaster";

export function postText(code: string): string {
  return `Verifying my Byzantium miner account: ${code}`;
}

export function newCode(): string {
  return "byz-" + randomBytes(4).toString("hex");
}

// Pull the author handle out of a post URL; null if it doesn't look right.
export function parsePostUrl(platform: Platform, url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  if (platform === "x") {
    if (host !== "x.com" && host !== "twitter.com") return null;
    if (seg[1] !== "status" || !seg[0]) return null;
    return seg[0].toLowerCase();
  }
  // farcaster
  if (host !== "warpcast.com" && host !== "farcaster.xyz") return null;
  if (!seg[0] || !seg[1]) return null;
  return seg[0].toLowerCase();
}

// Step 1: create/replace the pending verification row with a fresh code.
export async function startVerification(
  minerId: number,
  platform: Platform,
  handle: string
): Promise<Social> {
  const h = handle.trim().replace(/^@/, "").toLowerCase();
  const code = newCode();
  const rows = await sql`
    INSERT INTO miner_socials (miner_id, platform, handle, code, status)
    VALUES (${minerId}, ${platform}, ${h}, ${code}, 'pending')
    ON CONFLICT (miner_id, platform)
    DO UPDATE SET handle = ${h}, code = ${code}, status = 'pending',
                  post_url = NULL, verified_at = NULL
    RETURNING id, miner_id, platform, handle, code, post_url, status, verified_at
  `;
  return rows[0] as Social;
}

// Best-effort: fetch the post text and check the code is present.
async function postContainsCode(
  platform: Platform,
  url: string,
  handle: string,
  code: string
): Promise<boolean> {
  try {
    if (platform === "x") {
      const o = `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(url)}`;
      const res = await fetch(o, { cache: "no-store" });
      if (!res.ok) return false;
      const data: any = await res.json();
      const authorOk = (data.author_url || "").toLowerCase().endsWith("/" + handle);
      const hasCode = (data.html || "").includes(code);
      return authorOk && hasCode;
    }
    return false; // Farcaster auto-fetch not wired yet — falls back to admin review.
  } catch {
    return false;
  }
}

// Step 2: miner submits the post URL. Returns the row's new state + a message.
export async function submitProof(
  minerId: number,
  platform: Platform,
  postUrl: string
): Promise<{ status: Social["status"]; message: string }> {
  const rows = await sql`
    SELECT id, handle, code FROM miner_socials WHERE miner_id = ${minerId} AND platform = ${platform}
  `;
  const row: any = rows[0];
  if (!row) return { status: "rejected", message: "Start by entering your handle first." };

  const urlHandle = parsePostUrl(platform, postUrl);
  if (!urlHandle) return { status: "pending", message: "That doesn't look like a valid post URL." };
  if (urlHandle !== row.handle) {
    return {
      status: "pending",
      message: `The post is from @${urlHandle}, but you're verifying @${row.handle}.`,
    };
  }

  const auto = await postContainsCode(platform, postUrl, row.handle, row.code);
  if (auto) {
    await sql`
      UPDATE miner_socials SET post_url = ${postUrl}, status = 'verified', verified_at = now()
      WHERE id = ${row.id}
    `;
    return { status: "verified", message: "Verified! Your handle is confirmed." };
  }

  // Couldn't auto-confirm — save the proof and queue for manual review.
  await sql`UPDATE miner_socials SET post_url = ${postUrl}, status = 'pending' WHERE id = ${row.id}`;
  return {
    status: "pending",
    message: "Submitted. We couldn't auto-verify, so an admin will review your post shortly.",
  };
}

// ---- admin review ----

export async function getPendingSocials(): Promise<
  (Social & { miner_handle: string })[]
> {
  const rows = await sql`
    SELECT s.id, s.miner_id, s.platform, s.handle, s.code, s.post_url, s.status, s.verified_at,
           m.handle AS miner_handle
    FROM miner_socials s JOIN miners m ON m.id = s.miner_id
    WHERE s.status = 'pending' AND s.post_url IS NOT NULL
    ORDER BY s.created_at
  `;
  return rows as any;
}

export async function setSocialStatus(id: number, status: "verified" | "rejected"): Promise<void> {
  if (status === "verified") {
    await sql`UPDATE miner_socials SET status = 'verified', verified_at = now() WHERE id = ${id}`;
  } else {
    await sql`UPDATE miner_socials SET status = 'rejected' WHERE id = ${id}`;
  }
}
