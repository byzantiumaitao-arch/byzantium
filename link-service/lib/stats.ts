// Aggregation helpers for the dashboards.
//
// These combine the SQL rollups in lib/clicks.ts with the campaign registry to
// produce exactly what each dashboard renders. Counting happens in Postgres
// (exact, not capped by a row limit); this layer just merges and shapes it.
//
// NOTE: this counts RAW clicks only. It says nothing about whether a click is a
// genuine human — that authenticity scoring lives in the private repo, never here.

import {
  countTotalClicks,
  countDistinctMiners,
  clicksByCampaign,
  clicksByMiner,
  getRecentClicks,
  type Click,
} from "./clicks";
import { passesFilter } from "./signals";
import { listCampaigns, type Campaign } from "./campaigns";

export type CampaignStat = Campaign & { clicks: number; miners: number };
export type MinerStat = { miner: string; clicks: number; campaigns: number };

export type Overview = {
  totalClicks: number;
  campaignCount: number;
  minerCount: number;
  campaigns: CampaignStat[];
};

// Public, campaign-centric rollup for the overall dashboard.
export async function getOverview(): Promise<Overview> {
  const campaigns = listCampaigns();
  const [total, minerCount, byCampaign] = await Promise.all([
    countTotalClicks(),
    countDistinctMiners(),
    clicksByCampaign(),
  ]);

  const counts = new Map(byCampaign.map((r) => [r.campaign, r]));
  const campaignStats: CampaignStat[] = campaigns
    .map((c) => ({
      ...c,
      clicks: counts.get(c.slug)?.clicks ?? 0,
      miners: counts.get(c.slug)?.miners ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return {
    totalClicks: total,
    campaignCount: campaigns.length,
    minerCount,
    campaigns: campaignStats,
  };
}

// Leaderboard of miners by click volume (admin view).
export async function getTopMiners(limit = 50): Promise<MinerStat[]> {
  return clicksByMiner(limit);
}

export type MinerCampaignRow = { campaign: string; total: number; qualified: number };
export type RecentClick = Click & { qualified: boolean };

// Everything one miner needs to see on their own dashboard.
//
// "total" = every recorded click; "qualified" = passed the public fingerprint /
// bot pre-filter (see passesFilter). Both are computed from the same loaded set
// so the two numbers are always consistent with each other. Capped at 5000 rows
// (paginate later if a miner ever exceeds it).
export async function getMinerSummary(miner: string) {
  const clicks = await getRecentClicks({ miner, limit: 5000 });

  const byCampaign = new Map<string, MinerCampaignRow>();
  let qualifiedTotal = 0;
  for (const c of clicks) {
    const row =
      byCampaign.get(c.campaign) || { campaign: c.campaign, total: 0, qualified: 0 };
    row.total++;
    if (passesFilter(c)) {
      row.qualified++;
      qualifiedTotal++;
    }
    byCampaign.set(c.campaign, row);
  }

  return {
    miner,
    totalClicks: clicks.length,
    qualifiedClicks: qualifiedTotal,
    perCampaign: [...byCampaign.values()].sort((a, b) => b.total - a.total),
    recent: clicks.slice(0, 50).map((c) => ({ ...c, qualified: passesFilter(c) })),
  };
}
