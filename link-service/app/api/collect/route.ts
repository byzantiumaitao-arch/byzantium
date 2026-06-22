import { NextRequest, NextResponse } from "next/server";
import { enrichClick } from "@/lib/clicks";

// Receives the device/behaviour signals gathered by the interstitial collector
// (lib/fingerprint.ts) and attaches them to the already-logged click row.
//
// Called via navigator.sendBeacon as the visitor navigates away, so it must be
// fast and never block: it returns 204 regardless and swallows errors. The id
// and payload come from the client and are UNTRUSTED — stored as raw signal for
// the (separate) authenticity scorer to weigh, not acted on here.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = Number(body?.id);
    if (Number.isInteger(id) && id > 0) {
      const fp = typeof body.fingerprint === "string" ? body.fingerprint.slice(0, 64) : null;
      const vid = typeof body.visitor_id === "string" ? body.visitor_id.slice(0, 64) : null;
      const signals =
        body.signals && typeof body.signals === "object" ? body.signals : null;
      // in_app is set server-side from the UA at log time; don't let the client
      // override it. enrichClick COALESCEs, so omitting it preserves that value.
      await enrichClick(id, { fingerprint: fp, visitor_id: vid, signals });
    }
  } catch (err) {
    console.error("collect failed", err);
  }
  // Always 204 — the beacon doesn't read the response, and a failure here must
  // never look like an error to the navigating client.
  return new NextResponse(null, { status: 204 });
}
