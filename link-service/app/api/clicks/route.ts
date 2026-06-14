import { NextRequest, NextResponse } from "next/server";
import { getRecentClicks } from "@/lib/clicks";

// Read feed of recent clicks.
//   GET /api/clicks                  -> all recent clicks (newest first)
//   GET /api/clicks?campaign=launch  -> just one campaign's
//   GET /api/clicks?miner=alice      -> just one miner's
//
// Stub note: this reads the in-memory buffer, so it only shows clicks served by
// the same running instance (great locally; partial in serverless). The durable
// record while stubbed is the Vercel log stream. This same endpoint becomes the
// public read feed once it reads from Postgres.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const campaign = req.nextUrl.searchParams.get("campaign") || undefined;
  const miner = req.nextUrl.searchParams.get("miner") || undefined;
  const clicks = getRecentClicks({ campaign, miner });
  return NextResponse.json({ count: clicks.length, clicks });
}
