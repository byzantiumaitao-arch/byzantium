import { NextResponse } from "next/server";
import { settledMinerScores } from "@/lib/publicfeed";
import { computeWeights } from "@/lib/weights";
import { PUBLIC_REVEAL_DELAY_HOURS } from "@/lib/config";

// GET /api/validator/weights
//
// Per-miner reward weights — the only thing copyweight validators need. Computed
// by the PUBLIC formula (lib/weights.ts) from settled per-click authenticity
// scores, normalised to sum 1.0. Fully reproducible from GET /api/validator/clicks.

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await settledMinerScores();
  const weights = computeWeights(rows);
  return NextResponse.json({
    generated_at: new Date().toISOString(),
    reveal_delay_hours: PUBLIC_REVEAL_DELAY_HOURS,
    formula: "weight = miner_score_sum / Σ score_sum over settled clicks",
    methodology: "/api/validator/methodology",
    count: weights.length,
    weights,
  });
}
