import { NextResponse } from "next/server";
import { settledMinerScores } from "@/lib/publicfeed";
import { computeWeights } from "@/lib/weights";
import { hotkeysByHandle } from "@/lib/miners";
import { PUBLIC_REVEAL_DELAY_HOURS } from "@/lib/config";

// GET /api/validator/weights
//
// Per-miner reward weights — the only thing copyweight validators need. Computed
// by the PUBLIC formula (lib/weights.ts) from settled per-click authenticity
// scores, normalised to sum 1.0. Fully reproducible from GET /api/validator/clicks.
//
// Each row also carries the miner's `hotkey` (Bittensor SS58 payout address) so a
// weight_copy validator can `set_weights` against the right key. `hotkey: null`
// means the miner hasn't registered a payout address yet — not yet payable.

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await settledMinerScores();
  const hotkeys = await hotkeysByHandle();
  const weights = computeWeights(rows).map((w) => ({
    ...w,
    hotkey: hotkeys[w.miner] ?? null,
  }));
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    reveal_delay_hours: PUBLIC_REVEAL_DELAY_HOURS,
    formula: "weight = miner_score_sum / Σ score_sum over settled clicks",
    methodology: "/api/validator/methodology",
    count: weights.length,
    weights,
  });
}
