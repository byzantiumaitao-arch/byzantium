import { NextRequest, NextResponse } from "next/server";
import { getRecentClicks } from "@/lib/clicks";

// Read feed of recent clicks.
//   GET /api/clicks            -> all recent clicks (newest first)
//   GET /api/clicks?slug=alice -> just alice's
//
// Stub note: this reads the in-memory buffer, so it only shows clicks served by
// the same running instance (great locally; partial in serverless). The durable
// record while stubbed is the Vercel log stream. This same endpoint becomes the
// public read feed once it reads from Postgres.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || undefined;
  const clicks = getRecentClicks(slug);
  return NextResponse.json({ count: clicks.length, clicks });
}
