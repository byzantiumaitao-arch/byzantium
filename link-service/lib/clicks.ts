// Click storage — backed by Neon Postgres.
//
// The redirect handler calls logClick(); the dashboards call the read/aggregate
// helpers below. All of them go through the shared `sql` client (lib/db.ts), so
// this is the only file that knows clicks live in Postgres.
//
// Append-only: we INSERT clicks and never mutate them. This records the RAW click
// signals only — judging whether a click is a genuine human (authenticity
// scoring) happens in a separate service that is not part of this repo.

import { sql } from "./db";

export type Click = {
  campaign: string;
  miner: string;
  ts: string; // ISO 8601
  ip: string | null;
  ua: string | null;
  accept_lang: string | null;
  referer: string | null;
  // Raw device signals, collected by the interstitial in a later milestone:
  fingerprint: string | null;
  visitor_id: string | null;
  in_app: boolean | null;
};

export async function logClick(c: Click): Promise<void> {
  await sql`
    INSERT INTO clicks
      (campaign, miner, ts, ip, ua, accept_lang, referer, fingerprint, visitor_id, in_app)
    VALUES
      (${c.campaign}, ${c.miner}, ${c.ts}, ${c.ip}, ${c.ua}, ${c.accept_lang},
       ${c.referer}, ${c.fingerprint}, ${c.visitor_id}, ${c.in_app})
  `;
}

// Map a DB row to a Click (ts comes back as a Date; normalise to ISO string).
function toClick(r: any): Click {
  return {
    campaign: r.campaign,
    miner: r.miner,
    ts: r.ts instanceof Date ? r.ts.toISOString() : String(r.ts),
    ip: r.ip,
    ua: r.ua,
    accept_lang: r.accept_lang,
    referer: r.referer,
    fingerprint: r.fingerprint,
    visitor_id: r.visitor_id,
    in_app: r.in_app,
  };
}

// Recent raw clicks, newest first, optionally filtered. Used by the feed API and
// the per-row tables on the dashboards.
export async function getRecentClicks(filter?: {
  campaign?: string;
  miner?: string;
  limit?: number;
}): Promise<Click[]> {
  const limit = Math.min(filter?.limit ?? 500, 1000);
  let rows;
  if (filter?.campaign && filter?.miner) {
    rows = await sql`SELECT * FROM clicks WHERE campaign = ${filter.campaign} AND miner = ${filter.miner} ORDER BY ts DESC LIMIT ${limit}`;
  } else if (filter?.campaign) {
    rows = await sql`SELECT * FROM clicks WHERE campaign = ${filter.campaign} ORDER BY ts DESC LIMIT ${limit}`;
  } else if (filter?.miner) {
    rows = await sql`SELECT * FROM clicks WHERE miner = ${filter.miner} ORDER BY ts DESC LIMIT ${limit}`;
  } else {
    rows = await sql`SELECT * FROM clicks ORDER BY ts DESC LIMIT ${limit}`;
  }
  return rows.map(toClick);
}

// ---- Aggregations (done in SQL so counts are exact, not capped by a row limit) ----

export async function countTotalClicks(): Promise<number> {
  const [r] = await sql`SELECT count(*)::int AS n FROM clicks`;
  return r.n;
}

export async function countDistinctMiners(): Promise<number> {
  const [r] = await sql`SELECT count(DISTINCT miner)::int AS n FROM clicks`;
  return r.n;
}

// Per-campaign rollup: clicks + distinct miners for each campaign slug.
export async function clicksByCampaign(): Promise<
  { campaign: string; clicks: number; miners: number }[]
> {
  const rows = await sql`
    SELECT campaign, count(*)::int AS clicks, count(DISTINCT miner)::int AS miners
    FROM clicks GROUP BY campaign
  `;
  return rows as any;
}

// Miner leaderboard.
export async function clicksByMiner(
  limit = 50
): Promise<{ miner: string; clicks: number; campaigns: number }[]> {
  const rows = await sql`
    SELECT miner, count(*)::int AS clicks, count(DISTINCT campaign)::int AS campaigns
    FROM clicks GROUP BY miner ORDER BY clicks DESC LIMIT ${limit}
  `;
  return rows as any;
}

// One miner's clicks broken down by campaign.
export async function minerClicksByCampaign(
  miner: string
): Promise<{ campaign: string; count: number }[]> {
  const rows = await sql`
    SELECT campaign, count(*)::int AS count
    FROM clicks WHERE miner = ${miner} GROUP BY campaign ORDER BY count DESC
  `;
  return rows as any;
}

export async function countMinerClicks(miner: string): Promise<number> {
  const [r] = await sql`SELECT count(*)::int AS n FROM clicks WHERE miner = ${miner}`;
  return r.n;
}
