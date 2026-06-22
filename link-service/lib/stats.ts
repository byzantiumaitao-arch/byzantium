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
  minerClicksByCampaign,
  countMinerClicks,
  getRecentClicks,
} from "./clicks";
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

// Everything one miner needs to see on their own dashboard.
export async function getMinerSummary(miner: string) {
  const [totalClicks, perCampaign, recent] = await Promise.all([
    countMinerClicks(miner),
    minerClicksByCampaign(miner),
    getRecentClicks({ miner, limit: 50 }),
  ]);
  return { miner, totalClicks, perCampaign, recent };
}
