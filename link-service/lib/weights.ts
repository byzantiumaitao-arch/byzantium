// PUBLIC weights formula — the audited step.
//
// Given each miner's settled authenticity-score sum (the private scorer's
// per-click outputs, summed), a miner's weight is their share of the total,
// normalised to sum to 1.0 so it maps directly onto a Bittensor set_weights
// call. Deliberately simple: in v2, anyone with the per-click audit feed
// (/api/validator/clicks, opens in v2) will be able to recompute this and confirm
// /api/validator/weights matches. The ONLY non-public step is how each per-click
// authenticity_score was produced.

export type MinerWeight = {
  miner: string;
  weight: number;
  score_sum: number;
  scored_clicks: number;
};

export function computeWeights(
  rows: { miner: string; score_sum: number; scored_clicks: number }[]
): MinerWeight[] {
  const total = rows.reduce((a, r) => a + Math.max(r.score_sum, 0), 0);
  return rows
    .map((r) => ({
      miner: r.miner,
      score_sum: r.score_sum,
      scored_clicks: r.scored_clicks,
      weight: total > 0 ? Math.max(r.score_sum, 0) / total : 0,
    }))
    .sort((a, b) => b.weight - a.weight);
}
