import { NextRequest, NextResponse } from "next/server";
import { logClick, type Click } from "@/lib/clicks";
import { DESTINATION_URL, MARKETING_URL, RESERVED_SLUGS } from "@/lib/config";

// The redirect heart of the service:  link.byzantiumai.net/<slug>
//   1. log the click (append-only)
//   2. 302 -> Taostats
//
// M1 is a pure redirect + log. The ~100ms FingerprintJS interstitial (M3) slots
// in between steps 1 and 2 later, without changing this contract.

export const dynamic = "force-dynamic"; // never cache a redirect

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

  // Ignore reserved paths and anything that looks like a file (has a dot) —
  // send those to the marketing site rather than logging junk clicks.
  if (RESERVED_SLUGS.has(slug) || slug.includes(".")) {
    return NextResponse.redirect(MARKETING_URL, 302);
  }

  const h = req.headers;
  const click: Click = {
    link_slug: slug,
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

  // Don't let a logging hiccup ever block the redirect — the miner's link must
  // always work, even if we miss recording one click.
  try {
    await logClick(click);
  } catch (err) {
    console.error("logClick failed", err);
  }

  return NextResponse.redirect(DESTINATION_URL, 302);
}
