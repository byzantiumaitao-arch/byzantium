import { NextResponse } from "next/server";
import { MARKETING_URL } from "@/lib/config";

// A single path segment (a miner with no campaign) can't be attributed to a
// campaign, so it isn't a valid tracking link. Send these to the marketing site.
// Real links always look like /<miner>/<campaign>.

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.redirect(MARKETING_URL, 302);
}
