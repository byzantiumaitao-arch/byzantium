import { NextRequest, NextResponse } from "next/server";
import { getRecentClicks } from "@/lib/clicks";
import { isAdminRequest } from "@/lib/auth";

// ADMIN-ONLY raw click feed.
//   GET /api/clicks                  -> all recent clicks (newest first)
//   GET /api/clicks?campaign=launch  -> just one campaign's
//   GET /api/clicks?miner=alice      -> just one miner's
//
// This returns RAW rows — ip, ua, fingerprint, visitor_id, signals — i.e. PII
// and the unfiltered signal stream. It is NOT public. The privacy-safe public
// feed (/api/validator/clicks, IP/UA dropped, salted tokens) opens in v2. Access requires
// either a logged-in admin session (browser) or an `x-admin-key` header matching
// ADMIN_PASSWORD (server-to-server tooling, e.g. the api-monitor).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const campaign = req.nextUrl.searchParams.get("campaign") || undefined;
  const miner = req.nextUrl.searchParams.get("miner") || undefined;
  const clicks = await getRecentClicks({ campaign, miner });
  return NextResponse.json({ count: clicks.length, clicks });
}
