import { NextRequest, NextResponse } from "next/server";
import { settledClicks } from "@/lib/publicfeed";
import { toPublicClick } from "@/lib/publicdata";
import { PUBLIC_REVEAL_DELAY_HOURS } from "@/lib/config";

// GET /api/validator/clicks?since=<id>&limit=<n>
//
// Public, privacy-filtered, delayed click feed for independent validators. Each
// row is stripped of raw IP/UA/headers and carries the per-click
// authenticity_score (revealed only after the settle delay), so a validator can
// re-score the same clicks and confirm /api/validator/weights. Cursor by id:
// pass ?since=<last id seen> (or next_since from the previous page) to page forward.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const since = Number(req.nextUrl.searchParams.get("since") ?? 0) || 0;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 500) || 500;
  const rows = await settledClicks(since, limit);
  const clicks = rows.map(toPublicClick);
  const next_since = clicks.length ? clicks[clicks.length - 1].id : since;
  return NextResponse.json({
    reveal_delay_hours: PUBLIC_REVEAL_DELAY_HOURS,
    count: clicks.length,
    next_since,
    clicks,
  });
}
