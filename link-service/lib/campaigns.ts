// Campaign registry — backed by Postgres.
//
// Each campaign defines WHERE its links redirect. Miners promote a campaign, and
// every click is attributed to (campaign, miner). Admins add campaigns at
// /admin/campaigns; because both the redirect handler and the miner link builder
// read from this table, a new campaign is instantly available to every miner.

import { sql } from "./db";

export type Campaign = {
  slug: string;
  name: string;
  destination: string; // the target site every click for this campaign 302s to
  active: boolean;
};

// Small in-process cache for the redirect hot path. Campaigns change rarely, so
// caching the lookup avoids a Neon SELECT on every single click. TTL-bounded, and
// any admin write (add / activate / pause) clears it so changes take effect at
// once. Per warm instance — a cache miss just costs one SELECT, never staleness
// beyond the TTL. Tunable via CAMPAIGN_CACHE_TTL_MS (default 60s).
const CAMPAIGN_TTL_MS = Number(process.env.CAMPAIGN_CACHE_TTL_MS ?? 60_000);
const campaignCache = new Map<string, { value: Campaign | null; exp: number }>();

export function clearCampaignCache(): void {
  campaignCache.clear();
}

// Returns the campaign if it exists and is active, else null.
export async function getCampaign(slug: string): Promise<Campaign | null> {
  const key = slug.toLowerCase();
  const hit = campaignCache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;

  const rows = await sql`
    SELECT slug, name, destination, active
    FROM campaigns WHERE slug = ${key} AND active = true
  `;
  const value = (rows[0] as Campaign) || null;

  // Bound memory against slug-probing; real campaigns number in the dozens.
  if (campaignCache.size > 500) campaignCache.clear();
  campaignCache.set(key, { value, exp: Date.now() + CAMPAIGN_TTL_MS });
  return value;
}

// Active campaigns, for the miner link builder and public overview.
export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await sql`
    SELECT slug, name, destination, active FROM campaigns WHERE active = true ORDER BY name
  `;
  return rows as any;
}

// All campaigns incl. paused — for the admin management page.
export async function listAllCampaigns(): Promise<Campaign[]> {
  const rows = await sql`
    SELECT slug, name, destination, active FROM campaigns ORDER BY active DESC, name
  `;
  return rows as any;
}

const SLUG_RE = /^[a-z0-9_-]{2,40}$/;
export class CampaignError extends Error {}

// Create a campaign. slug is the URL segment (/<miner>/<slug>).
export async function addCampaign(input: {
  slug: string;
  name: string;
  destination: string;
}): Promise<void> {
  const slug = input.slug.trim().toLowerCase();
  const name = input.name.trim();
  let destination = input.destination.trim();

  if (!SLUG_RE.test(slug)) {
    throw new CampaignError("Slug must be 2–40 chars: lowercase letters, numbers, - or _.");
  }
  if (!name) throw new CampaignError("Name is required.");
  if (!/^https?:\/\/.+/i.test(destination)) {
    throw new CampaignError("Destination must be a full URL (https://…).");
  }

  try {
    await sql`
      INSERT INTO campaigns (slug, name, destination, active)
      VALUES (${slug}, ${name}, ${destination}, true)
    `;
  } catch (e: any) {
    if (e?.code === "23505" || /duplicate key/i.test(e?.message || "")) {
      throw new CampaignError("That slug is already taken.");
    }
    throw e;
  }
  clearCampaignCache();
}

export async function setCampaignActive(slug: string, active: boolean): Promise<void> {
  await sql`UPDATE campaigns SET active = ${active} WHERE slug = ${slug.toLowerCase()}`;
  clearCampaignCache();
}
