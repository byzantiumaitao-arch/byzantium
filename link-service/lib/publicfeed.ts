// Read queries for the public validator feed (/api/validator/*).
//
// A click is "settled" — eligible to publish and to count toward weights — once
// the private scorer has stamped it (scored_at IS NOT NULL) AND the reveal delay
// has elapsed. The delay is what makes per-click transparency safe: the score is
// only ever exposed after rewards for that click are locked in, so the feed
// can't be used for live gaming. Unscored or too-recent clicks are withheld
// entirely. This file only READS scores; it never computes them.

import { sql } from "./db";
import { PUBLIC_REVEAL_DELAY_HOURS } from "./config";

// Settled clicks, ascending by id, for cursor pagination (?since=<last id>).
export async function settledClicks(sinceId: number, limit: number) {
  const lim = Math.min(Math.max(limit, 1), 1000);
  return sql`
    SELECT id, campaign, miner, ts, ip, fingerprint, in_app, signals, authenticity_score
    FROM clicks
    WHERE id > ${sinceId}
      AND scored_at IS NOT NULL
      AND scored_at < now() - make_interval(hours => ${PUBLIC_REVEAL_DELAY_HOURS})
    ORDER BY id ASC
    LIMIT ${lim}
  `;
}

// Per-miner sum of settled authenticity scores — the input to the public weights
// formula. Mirrors exactly what an auditor gets by summing the clicks feed, so
// /weights is reproducible from /clicks.
export async function settledMinerScores(): Promise<
  { miner: string; score_sum: number; scored_clicks: number }[]
> {
  const rows = await sql`
    SELECT miner,
           count(*)::int                      AS scored_clicks,
           coalesce(sum(authenticity_score), 0)::float AS score_sum
    FROM clicks
    WHERE scored_at IS NOT NULL
      AND scored_at < now() - make_interval(hours => ${PUBLIC_REVEAL_DELAY_HOURS})
    GROUP BY miner
  `;
  return rows as any;
}
