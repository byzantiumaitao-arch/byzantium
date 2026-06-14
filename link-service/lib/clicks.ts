// Click logging — STUB storage for M1.
//
// This is the one file that changes when we move from "stub" to a real database.
// Everything else (the redirect handler, the feed API) talks to logClick() and
// getRecentClicks() and never needs to know where the data actually lives.
//
// Stub behaviour:
//   1. console.log every click as one JSON line  -> visible in `vercel logs`
//      (this is the durable record while we're stubbed; survives across requests).
//   2. keep the last N clicks in memory            -> powers GET /api/clicks so you
//      can eyeball recent hits during local dev.
//
// Swapping in Postgres later is a drop-in: replace the body of logClick() with an
// INSERT and getRecentClicks() with a SELECT. The append-only contract holds —
// we only ever add clicks, never mutate them.
//
// This records the RAW click signals only. Judging whether a click is a genuine
// human (the authenticity scoring) happens in a separate service that is not part
// of this repo.

export type Click = {
  campaign: string;
  miner: string;
  ts: string; // ISO 8601
  ip: string | null;
  ua: string | null;
  accept_lang: string | null;
  referer: string | null;
  // Raw device signals, collected by the interstitial in a later milestone
  // (kept here so the shape is stable from day one):
  fingerprint: string | null;
  visitor_id: string | null;
  in_app: boolean | null;
};

// In-memory ring buffer (cleared on cold start — fine for a stub).
const RECENT_LIMIT = 500;
const recent: Click[] = [];

export async function logClick(click: Click): Promise<void> {
  // 1) Durable-ish stub record: structured log line, readable in Vercel logs.
  console.log(`click ${JSON.stringify(click)}`);

  // 2) In-memory buffer for the local feed.
  recent.push(click);
  if (recent.length > RECENT_LIMIT) recent.shift();
}

export function getRecentClicks(filter?: {
  campaign?: string;
  miner?: string;
}): Click[] {
  let list = recent;
  if (filter?.campaign) list = list.filter((c) => c.campaign === filter.campaign);
  if (filter?.miner) list = list.filter((c) => c.miner === filter.miner);
  // Newest first.
  return [...list].reverse();
}
