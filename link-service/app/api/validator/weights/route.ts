import { NextResponse } from "next/server";
import { settledMinerScores } from "@/lib/publicfeed";
import { computeWeights } from "@/lib/weights";
import { hotkeysByHandle } from "@/lib/miners";
import { PUBLIC_REVEAL_DELAY_HOURS, BURN_HOTKEY } from "@/lib/config";

// GET /api/validator/weights
//
// Per-miner reward weights — the only thing copyweight validators need. Computed
// by the PUBLIC formula (lib/weights.ts) from settled per-click authenticity
// scores, normalised to sum 1.0. Fully reproducible from GET /api/validator/clicks.
//
// Each row carries the miner's `hotkey` (Bittensor SS58 payout address) so a
// weight_copy validator can `set_weights` against the right key. Weight earned by
// miners with no payout hotkey is NOT redistributed — it is folded into a single
// `"(burn)"` row (marked `burn: true`, hotkey = BURN_HOTKEY) and burned, so every
// miner with a hotkey keeps exactly their own share.

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await settledMinerScores();
  const hotkeys = await hotkeysByHandle();
  const scored = computeWeights(rows).map((w) => ({
    ...w,
    hotkey: hotkeys[w.miner] ?? null,
  }));

  // Split payable (has a hotkey) from unpayable, and burn the unpayable share.
  const payable = scored.filter((w) => w.hotkey);
  const unpayable = scored.filter((w) => !w.hotkey);
  const weights: any[] = [...payable];
  if (unpayable.length) {
    weights.push({
      miner: "(burn)",
      hotkey: BURN_HOTKEY || null,
      burn: true,
      score_sum: unpayable.reduce((a, w) => a + w.score_sum, 0),
      scored_clicks: unpayable.reduce((a, w) => a + w.scored_clicks, 0),
      weight: unpayable.reduce((a, w) => a + w.weight, 0),
    });
  }
  weights.sort((a, b) => b.weight - a.weight);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    reveal_delay_hours: PUBLIC_REVEAL_DELAY_HOURS,
    formula: "weight = miner_score_sum / Σ score_sum over settled clicks",
    burn_note: "miners with no payout hotkey are folded into the (burn) row, not redistributed",
    count: weights.length,
    weights,
  });
}
