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
  // Device/behaviour signals. The header-only insert leaves these null; the
  // interstitial collector fills them in via enrichClick() (POST /api/collect).
  // A row whose fingerprint stays null = JS never ran (a strong bot signal).
  fingerprint: string | null;
  visitor_id: string | null;
  in_app: boolean | null;
  signals: Record<string, unknown> | null;
};

// Insert the header-only click and return its id, so the interstitial can later
// attach the device signals to this exact row.
export async function logClick(
  c: Omit<Click, "signals"> & { signals?: Click["signals"] }
): Promise<number> {
  const [row] = await sql`
    INSERT INTO clicks
      (campaign, miner, ts, ip, ua, accept_lang, referer, fingerprint, visitor_id, in_app)
    VALUES
      (${c.campaign}, ${c.miner}, ${c.ts}, ${c.ip}, ${c.ua}, ${c.accept_lang},
       ${c.referer}, ${c.fingerprint}, ${c.visitor_id}, ${c.in_app})
    RETURNING id
  `;
  return row.id as number;
}

// Attach device/behaviour signals to an already-logged click. Best-effort: the
// id comes from the client, so treat the data as untrusted raw signal (the
// authenticity scorer, which lives elsewhere, decides what to trust).
export async function enrichClick(
  id: number,
  patch: {
    fingerprint?: string | null;
    visitor_id?: string | null;
    in_app?: boolean | null;
    signals?: Record<string, unknown> | null;
  }
): Promise<void> {
  await sql`
    UPDATE clicks SET
      fingerprint = COALESCE(${patch.fingerprint ?? null}, fingerprint),
      visitor_id  = COALESCE(${patch.visitor_id ?? null}, visitor_id),
      in_app      = COALESCE(${patch.in_app ?? null}, in_app),
      signals     = ${patch.signals ? JSON.stringify(patch.signals) : null}::jsonb
    WHERE id = ${id}
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
    signals: r.signals ?? null,
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

// ---- Dedup / overlap (raw aggregates for human review, not a score) ----

function toIso(v: any): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

export type FingerprintCluster = {
  fingerprint: string;
  clicks: number;
  miners: number;
  ips: number;
  campaigns: number;
  first: string;
  last: string;
};

// One row per device fingerprint that repeats (>1 click) or is shared across
// miners. A single fingerprint crediting MULTIPLE miners is the strongest tell:
// it means one device is farming clicks across accounts.
export async function fingerprintClusters(limit = 50): Promise<FingerprintCluster[]> {
  const rows = await sql`
    SELECT fingerprint,
           count(*)::int             AS clicks,
           count(DISTINCT miner)::int AS miners,
           count(DISTINCT ip)::int    AS ips,
           count(DISTINCT campaign)::int AS campaigns,
           min(ts) AS first, max(ts) AS last
    FROM clicks
    WHERE fingerprint IS NOT NULL
    GROUP BY fingerprint
    HAVING count(*) > 1 OR count(DISTINCT miner) > 1
    ORDER BY count(DISTINCT miner) DESC, count(*) DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    fingerprint: r.fingerprint,
    clicks: r.clicks,
    miners: r.miners,
    ips: r.ips,
    campaigns: r.campaigns,
    first: toIso(r.first),
    last: toIso(r.last),
  }));
}

export type IpCluster = {
  ip: string;
  clicks: number;
  miners: number;
  fingerprints: number;
  campaigns: number;
  first: string;
  last: string;
};

// Same idea by IP — catches farms that rotate the browser fingerprint but sit
// behind one address (and datacenter IPs with many clicks).
export async function ipClusters(limit = 50): Promise<IpCluster[]> {
  const rows = await sql`
    SELECT ip,
           count(*)::int                  AS clicks,
           count(DISTINCT miner)::int      AS miners,
           count(DISTINCT fingerprint)::int AS fingerprints,
           count(DISTINCT campaign)::int    AS campaigns,
           min(ts) AS first, max(ts) AS last
    FROM clicks
    WHERE ip IS NOT NULL
    GROUP BY ip
    HAVING count(*) > 1 OR count(DISTINCT miner) > 1
    ORDER BY count(DISTINCT miner) DESC, count(*) DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({
    ip: r.ip,
    clicks: r.clicks,
    miners: r.miners,
    fingerprints: r.fingerprints,
    campaigns: r.campaigns,
    first: toIso(r.first),
    last: toIso(r.last),
  }));
}

export type VelocityRow = {
  fingerprint: string;
  clicks: number;
  perMin: number;
  miners: number;
  first: string;
  last: string;
};

// Fingerprints producing a burst of clicks inside a recent window — humans don't
// click the same link many times a minute. Returns those at/above `minCount`
// within the last `minutes`, fastest first.
export async function velocityFingerprints(
  minutes = 60,
  minCount = 5,
  limit = 50
): Promise<VelocityRow[]> {
  const rows = await sql`
    SELECT fingerprint,
           count(*)::int             AS clicks,
           count(DISTINCT miner)::int AS miners,
           min(ts) AS first, max(ts) AS last
    FROM clicks
    WHERE fingerprint IS NOT NULL
      AND ts > now() - make_interval(mins => ${minutes})
    GROUP BY fingerprint
    HAVING count(*) >= ${minCount}
    ORDER BY count(*) DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => {
    const first = toIso(r.first);
    const last = toIso(r.last);
    const spanMin = Math.max(
      (new Date(last).getTime() - new Date(first).getTime()) / 60000,
      1 / 60 // floor at one second so a same-instant burst doesn't divide by zero
    );
    return {
      fingerprint: r.fingerprint,
      clicks: r.clicks,
      miners: r.miners,
      perMin: Math.round((r.clicks / spanMin) * 10) / 10,
      first,
      last,
    };
  });
}
