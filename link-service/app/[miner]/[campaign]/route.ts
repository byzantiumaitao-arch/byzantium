import { NextRequest, NextResponse } from "next/server";
import { logClick, type Click } from "@/lib/clicks";
import { getCampaign } from "@/lib/campaigns";
import { MARKETING_URL } from "@/lib/config";

// The redirect heart of the service:
//   link.byzantiumai.net/<miner>/<campaign>
//     1. look up the campaign's destination
//     2. log the click, attributed to (miner, campaign)
//     3. 302 -> the campaign's target site
//
// This records RAW click signals only. Judging whether a click is a genuine
// human (authenticity scoring) happens in a separate service, not here.

export const dynamic = "force-dynamic"; // never cache a redirect

export async function GET(
  req: NextRequest,
  { params }: { params: { miner: string; campaign: string } }
) {
  const { miner, campaign: campaignSlug } = params;

  const campaign = getCampaign(campaignSlug);
  // Unknown/inactive campaign, or junk that looks like a file — don't log a junk
  // click; just send the visitor to the marketing site.
  if (!campaign || campaignSlug.includes(".") || miner.includes(".")) {
    return NextResponse.redirect(MARKETING_URL, 302);
  }

  const h = req.headers;
  const click: Click = {
    campaign: campaign.slug,
    miner,
    ts: new Date().toISOString(),
    // x-forwarded-for is the real client IP behind Vercel's edge.
    ip: (h.get("x-forwarded-for") || "").split(",")[0].trim() || null,
    ua: h.get("user-agent"),
    accept_lang: h.get("accept-language"),
    referer: h.get("referer"),
    // Raw device signals, collected by the interstitial in a later milestone:
    fingerprint: null,
    visitor_id: null,
    in_app: null,
  };

  // Never let a logging hiccup block the redirect — the link must always work.
  try {
    await logClick(click);
  } catch (err) {
    console.error("logClick failed", err);
  }

  return NextResponse.redirect(campaign.destination, 302);
}
