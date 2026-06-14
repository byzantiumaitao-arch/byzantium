// Campaign registry — STUB for now.
//
// Each campaign defines WHERE its links redirect. Miners promote a campaign, and
// every click is attributed to (campaign, miner). This is the only file that
// changes when campaigns move to the database — getCampaign() keeps the same
// contract, so the routes never need to know where campaigns are stored.
//
// To add a campaign today: add an entry below. Later: load from Postgres / an
// admin UI so brands can launch campaigns without a code change.

export type Campaign = {
  slug: string;
  name: string;
  destination: string; // the target site every click for this campaign 302s to
  active: boolean;
};

const CAMPAIGNS: Record<string, Campaign> = {
  // --- Example campaigns — edit these or add your own ---
  launch: {
    slug: "launch",
    name: "Byzantium — awareness",
    destination: "https://byzantiumai.net",
    active: true,
  },
  buy: {
    slug: "buy",
    name: "Buy ن on Taostats",
    destination: "https://taostats.io",
    active: true,
  },
};

// Returns the campaign if it exists and is active, else null.
export function getCampaign(slug: string): Campaign | null {
  const c = CAMPAIGNS[slug.toLowerCase()];
  return c && c.active ? c : null;
}

export function listCampaigns(): Campaign[] {
  return Object.values(CAMPAIGNS).filter((c) => c.active);
}
