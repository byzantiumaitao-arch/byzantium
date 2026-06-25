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

// Returns the campaign if it exists and is active, else null.
export async function getCampaign(slug: string): Promise<Campaign | null> {
  const rows = await sql`
    SELECT slug, name, destination, active
    FROM campaigns WHERE slug = ${slug.toLowerCase()} AND active = true
  `;
  return (rows[0] as Campaign) || null;
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
}

export async function setCampaignActive(slug: string, active: boolean): Promise<void> {
  await sql`UPDATE campaigns SET active = ${active} WHERE slug = ${slug.toLowerCase()}`;
}
