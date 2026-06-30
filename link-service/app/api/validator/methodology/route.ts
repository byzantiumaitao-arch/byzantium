import { NextResponse } from "next/server";
import { PUBLIC_REVEAL_DELAY_HOURS } from "@/lib/config";

// GET /api/validator/methodology
//
// Plain-English description of how scoring works, so the published numbers are
// explainable. States exactly what is public (the data + the scores→weights
// formula) and what is private (the per-click authenticity rule), so validators
// know precisely what they can and cannot reproduce.

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    overview:
      "Miners drive clicks to campaigns. Each click is fingerprinted, then a private scorer assigns a per-click authenticity score in [0,1]. A miner's reward weight is their share of the summed authenticity scores of their settled clicks.",
    pipeline: [
      "1. Click logged with raw signals (device fingerprint, headers, behaviour).",
      "2. PRIVATE scorer assigns authenticity_score ∈ [0,1] to each click. The rules are not published, so they can't be gamed.",
      `3. After a ${PUBLIC_REVEAL_DELAY_HOURS}h settle delay, the click + its score are published at /api/validator/clicks (raw IP/UA/headers stripped, identifiers salted-hashed).`,
      "4. PUBLIC formula turns scores into weights: weight = miner_score_sum / Σ score_sum. Published at /api/validator/weights.",
    ],
    public: [
      "Every settled click, privacy-filtered: salted device & network hashes, benign device-shape features.",
      "The per-click authenticity_score (after the settle delay).",
      "The scores→weights formula — fully reproducible from the clicks feed.",
    ],
    private: [
      "The rule mapping a click's raw signals to its authenticity_score (bot-detection logic).",
      "Raw IP, User-Agent, request headers, and the full signal dump (PII).",
    ],
    verify:
      "Pull /api/validator/clicks, sum authenticity_score per miner over settled clicks, normalise to 1.0, and confirm it matches /api/validator/weights. Only the per-click score itself is taken on trust.",
    reveal_delay_hours: PUBLIC_REVEAL_DELAY_HOURS,
  });
}
