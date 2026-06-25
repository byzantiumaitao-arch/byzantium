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
  const campaigns = await listCampaigns();
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

export type MinerCampaignRow = { campaign: string; total: number };
export type DayBucket = { day: string; total: number };

// Qualified clicks are only CONFIRMED after this review window. Showing them on a
// delay (and never per-click) is deliberate anti-gaming: a miner can't tell in
// real time which technique passed the bot/device checks, so they can't tune an
// attack against the filter. The admin views still see live per-click detail.
const REVIEW_MS = 48 * 60 * 60 * 1000; // 48 hours

// Total clicks per calendar day (UTC), last `days` days, zero-filled. Total only
// — no qualified/filtered split, so the per-day filtering pattern isn't exposed.
function dailyTotals(clicks: Click[], days = 14): DayBucket[] {
  const today = new Date();
  const keys: string[] = [];
  const map = new Map<string, DayBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    map.set(key, { day: key, total: 0 });
  }
  for (const c of clicks) {
    const b = map.get(c.ts.slice(0, 10));
    if (b) b.total++;
  }
  return keys.map((k) => map.get(k)!);
}

// What a miner sees on their own dashboard. Totals are live; the single
// "qualified" number is DELAYED (only clicks older than the review window count)
// and there is intentionally no per-click or per-period qualified breakdown.
export async function getMinerSummary(miner: string) {
  const clicks = await getRecentClicks({ miner, limit: 5000 });
  const cutoff = Date.now() - REVIEW_MS;

  const byCampaign = new Map<string, MinerCampaignRow>();
  let qualifiedConfirmed = 0;
  let inReview = 0;
  for (const c of clicks) {
    const row = byCampaign.get(c.campaign) || { campaign: c.campaign, total: 0 };
    row.total++;
    byCampaign.set(c.campaign, row);

    if (Date.parse(c.ts) >= cutoff) inReview++; // too recent to confirm yet
    else if (passesFilter(c)) qualifiedConfirmed++; // confirmed genuine
  }

  return {
    miner,
    totalClicks: clicks.length,
    qualifiedClicks: qualifiedConfirmed, // delayed, aggregate only
    inReview,
    reviewHours: REVIEW_MS / 3_600_000,
    perCampaign: [...byCampaign.values()].sort((a, b) => b.total - a.total),
    daily: dailyTotals(clicks, 14),
    recent: clicks.slice(0, 50), // shown without any qualified/filtered label
  };
}

// ---- Admin chart data ----
//
// Admin views see qualified vs total LIVE (no review delay) and per-period — they
// are the operator and need full detail to spot gaming. (The miner-facing summary
// above deliberately hides all of this.)

export type DayFull = { day: string; total: number; qualified: number };
export type CampaignSplit = { campaign: string; total: number; qualified: number };
export type MinerSplit = { miner: string; total: number; qualified: number };

function dailyFull(clicks: Click[], days = 14): DayFull[] {
  const today = new Date();
  const keys: string[] = [];
  const map = new Map<string, DayFull>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    keys.push(key);
    map.set(key, { day: key, total: 0, qualified: 0 });
  }
  for (const c of clicks) {
    const b = map.get(c.ts.slice(0, 10));
    if (b) {
      b.total++;
      if (passesFilter(c)) b.qualified++;
    }
  }
  return keys.map((k) => map.get(k)!);
}

// One miner, for the admin detail page: live qualified + per-campaign + per-day.
export async function getMinerAdminCharts(miner: string) {
  const clicks = await getRecentClicks({ miner, limit: 5000 });
  const byCampaign = new Map<string, CampaignSplit>();
  let total = 0;
  let qualified = 0;
  for (const c of clicks) {
    const r = byCampaign.get(c.campaign) || { campaign: c.campaign, total: 0, qualified: 0 };
    r.total++;
    total++;
    if (passesFilter(c)) {
      r.qualified++;
      qualified++;
    }
    byCampaign.set(c.campaign, r);
  }
  return {
    total,
    qualified,
    perCampaign: [...byCampaign.values()].sort((a, b) => b.total - a.total),
    daily: dailyFull(clicks, 14),
    recent: clicks.slice(0, 80),
  };
}

// One campaign, for the admin detail page: live qualified + per-day + top miners.
export async function getCampaignCharts(slug: string) {
  const clicks = await getRecentClicks({ campaign: slug, limit: 5000 });
  const byMiner = new Map<string, MinerSplit>();
  let total = 0;
  let qualified = 0;
  for (const c of clicks) {
    total++;
    const q = passesFilter(c);
    if (q) qualified++;
    const r = byMiner.get(c.miner) || { miner: c.miner, total: 0, qualified: 0 };
    r.total++;
    if (q) r.qualified++;
    byMiner.set(c.miner, r);
  }
  return {
    total,
    qualified,
    miners: byMiner.size,
    daily: dailyFull(clicks, 14),
    topMiners: [...byMiner.values()].sort((a, b) => b.total - a.total).slice(0, 20),
  };
}
