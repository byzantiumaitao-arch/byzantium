import { NextRequest, NextResponse } from "next/server";
import { logClick } from "@/lib/clicks";
import { getCampaign } from "@/lib/campaigns";
import { inAppFromUA, interstitialHTML } from "@/lib/fingerprint";
import { MARKETING_URL } from "@/lib/config";

// The redirect heart of the service:
//   link.byzantiumai.net/<miner>/<campaign>
//     1. look up the campaign's destination
//     2. log the click (header signals), attributed to (miner, campaign)
//     3. serve an interstitial that gathers device signals, then forwards to
//        the campaign's target site
//
// This records RAW click signals only. Judging whether a click is a genuine
// human (authenticity scoring) happens in a separate service, not here.

export const dynamic = "force-dynamic"; // never cache a redirect

export async function GET(
  req: NextRequest,
  { params }: { params: { miner: string; campaign: string } }
) {
  const { miner, campaign: campaignSlug } = params;

  const campaign = await getCampaign(campaignSlug);
  // Unknown/inactive campaign, or junk that looks like a file — don't log a junk
  // click; just send the visitor to the marketing site.
  if (!campaign || campaignSlug.includes(".") || miner.includes(".")) {
    return NextResponse.redirect(MARKETING_URL, 302);
  }

  const h = req.headers;
  const ua = h.get("user-agent");

  // Phase 1: log the header-only click and get its id. The interstitial then
  // enriches THIS row with device signals (POST /api/collect). If logging
  // fails, fall back to a plain redirect so the link always works.
  let clickId: number | null = null;
  try {
    clickId = await logClick({
      campaign: campaign.slug,
      miner,
      ts: new Date().toISOString(),
      // x-forwarded-for is the real client IP behind Vercel's edge.
      ip: (h.get("x-forwarded-for") || "").split(",")[0].trim() || null,
      ua,
      accept_lang: h.get("accept-language"),
      referer: h.get("referer"),
      fingerprint: null,
      visitor_id: null,
      in_app: inAppFromUA(ua),
    });
  } catch (err) {
    console.error("logClick failed", err);
    return NextResponse.redirect(campaign.destination, 302);
  }

  // Phase 2: serve the collector interstitial, which forwards to the destination.
  return new NextResponse(interstitialHTML(campaign.destination, clickId), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // Don't leak our path to the destination as a referrer.
      "referrer-policy": "no-referrer",
    },
  });
}
