// Read queries for the public validator feed (/api/validator/*).
//
// A click is "settled" — eligible to publish and to count toward weights — once
// the private scorer has stamped it (scored_at IS NOT NULL) AND the reveal delay
// has elapsed. The delay is what makes per-click transparency safe: the score is
// only ever exposed after rewards for that click are locked in, so the feed
// can't be used for live gaming. Unscored or too-recent clicks are withheld
// entirely. This file only READS scores; it never computes them.

import { sql } from "./db";
import { PUBLIC_REVEAL_DELAY_HOURS, WEIGHTS_WINDOW_DAYS } from "./config";

// Settled clicks, ascending by id, for cursor pagination (?since=<last id>).
// Windowed to the last WEIGHTS_WINDOW_DAYS so the feed exactly mirrors the clicks
// that weights are computed from (reproducibility: sum this feed → /weights).
// `delayHours` defaults to the public reveal delay. An admin-authenticated
// request may pass a smaller value (e.g. 0) for a real-time preview of what will
// become public later; public callers always get PUBLIC_REVEAL_DELAY_HOURS.
export async function settledClicks(
  sinceId: number,
  limit: number,
  delayHours: number = PUBLIC_REVEAL_DELAY_HOURS
) {
  const lim = Math.min(Math.max(limit, 1), 1000);
  return sql`
    SELECT id, campaign, miner, ts, ip, fingerprint, in_app, signals, authenticity_score
    FROM clicks
    WHERE id > ${sinceId}
      AND scored_at IS NOT NULL
      AND scored_at < now() - make_interval(hours => ${delayHours})
      AND ts > now() - make_interval(days => ${WEIGHTS_WINDOW_DAYS})
    ORDER BY id ASC
    LIMIT ${lim}
  `;
}

// Per-miner sum of settled authenticity scores over the last WEIGHTS_WINDOW_DAYS
// — the input to the public weights formula. A rolling window (not all-time) so
// weights track recent activity: quiet a few days → weight decays gently; active
// again → it recovers. Mirrors exactly what an auditor gets by summing the clicks
// feed, so /weights stays reproducible from /clicks.
export async function settledMinerScores(
  delayHours: number = PUBLIC_REVEAL_DELAY_HOURS
): Promise<{ miner: string; score_sum: number; scored_clicks: number }[]> {
  const rows = await sql`
    SELECT miner,
           count(*)::int                      AS scored_clicks,
           coalesce(sum(authenticity_score), 0)::float AS score_sum
    FROM clicks
    WHERE scored_at IS NOT NULL
      AND scored_at < now() - make_interval(hours => ${delayHours})
      AND ts > now() - make_interval(days => ${WEIGHTS_WINDOW_DAYS})
    GROUP BY miner
  `;
  return rows as any;
}
