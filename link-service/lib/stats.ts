// Aggregation helpers for the dashboards.
//
// These read the click store via getRecentClicks() and roll the raw clicks up
// into the numbers the dashboards show. Keeping all the counting here means the
// pages stay declarative, and when clicks move to Postgres only this file and
// lib/clicks.ts change — the dashboards keep calling the same functions.
//
// NOTE: this counts RAW clicks only. It says nothing about whether a click is a
// genuine human — that authenticity scoring lives in the private repo, never here.

import { getRecentClicks, type Click } from "./clicks";
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
export function getOverview(): Overview {
  const clicks = getRecentClicks();
  const campaigns = listCampaigns();

  const campaignStats: CampaignStat[] = campaigns.map((c) => {
    const mine = clicks.filter((k) => k.campaign === c.slug);
    return {
      ...c,
      clicks: mine.length,
      miners: new Set(mine.map((k) => k.miner)).size,
    };
  });
  // Busiest campaign first.
  campaignStats.sort((a, b) => b.clicks - a.clicks);

  return {
    totalClicks: clicks.length,
    campaignCount: campaigns.length,
    minerCount: new Set(clicks.map((k) => k.miner)).size,
    campaigns: campaignStats,
  };
}

// Leaderboard of miners by click volume (admin view).
export function getTopMiners(limit = 50): MinerStat[] {
  const clicks = getRecentClicks();
  const byMiner = new Map<string, Click[]>();
  for (const k of clicks) {
    const list = byMiner.get(k.miner) || [];
    list.push(k);
    byMiner.set(k.miner, list);
  }
  return [...byMiner.entries()]
    .map(([miner, list]) => ({
      miner,
      clicks: list.length,
      campaigns: new Set(list.map((k) => k.campaign)).size,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

// Everything one miner needs to see on their own dashboard.
export function getMinerSummary(miner: string) {
  const clicks = getRecentClicks({ miner });
  const byCampaign = new Map<string, number>();
  for (const k of clicks) byCampaign.set(k.campaign, (byCampaign.get(k.campaign) || 0) + 1);
  return {
    miner,
    totalClicks: clicks.length,
    perCampaign: [...byCampaign.entries()]
      .map(([campaign, count]) => ({ campaign, count }))
      .sort((a, b) => b.count - a.count),
    recent: clicks.slice(0, 50),
  };
}
