import { NextRequest, NextResponse } from "next/server";
import { settledMinerScores } from "@/lib/publicfeed";
import { computeWeights } from "@/lib/weights";
import { hotkeysByHandle } from "@/lib/miners";
import { isAdminRequest } from "@/lib/auth";
import { PUBLIC_REVEAL_DELAY_HOURS, BURN_HOTKEY } from "@/lib/config";

// GET /api/validator/weights
//
// Per-miner reward weights — the only thing copyweight validators need, and in v1
// the ONLY public validator endpoint. Computed by the PUBLIC formula
// (lib/weights.ts) from settled per-click authenticity scores, normalised to sum
// 1.0. The per-click audit feed (/api/validator/clicks) opens in v2.
//
// Each row carries the miner's `hotkey` (Bittensor SS58 payout address) so a
// weight_copy validator can `set_weights` against the right key. A miner with no
// payout hotkey keeps its own named row but is marked `burn: true` with
// hotkey = BURN_HOTKEY; its weight is NOT redistributed. A weight_copy validator
// sums all `burn: true` rows onto that single burn hotkey.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Admins may preview at a shorter delay (?delay=0 = live, real-time). Public
  // callers always get the full reveal delay, whatever the param says.
  const dParam = req.nextUrl.searchParams.get("delay");
  const delay =
    isAdminRequest(req) && dParam !== null && Number.isFinite(Number(dParam))
      ? Math.max(0, Number(dParam))
      : PUBLIC_REVEAL_DELAY_HOURS;

  const rows = await settledMinerScores(delay);
  const hotkeys = await hotkeysByHandle();

  // Every miner keeps its name and its own share. A miner with a payout hotkey is
  // paid directly. A miner with none is marked `burn: true` and its weight routes
  // to the burn hotkey (not redistributed to the others) — so the row shows the
  // miner by name alongside exactly what it will earn the moment it registers a
  // hotkey. A weight-copy validator sums all burn rows onto the single BURN_HOTKEY.
  const weights = computeWeights(rows)
    .map((w) => {
      const hotkey = hotkeys[w.miner] ?? null;
      return hotkey
        ? { ...w, hotkey, burn: false }
        : { ...w, hotkey: BURN_HOTKEY || null, burn: true };
    })
    .sort((a, b) => b.weight - a.weight);

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    reveal_delay_hours: delay,
    realtime: delay !== PUBLIC_REVEAL_DELAY_HOURS,
    formula: "weight = miner_score_sum / Σ score_sum over settled clicks",
    burn_note:
      "rows with burn:true have no payout hotkey — their weight is not redistributed; it routes to the burn hotkey (BURN_HOTKEY). A weight-copy validator should sum all burn:true rows onto that single hotkey.",
    count: weights.length,
    weights,
  });
}
