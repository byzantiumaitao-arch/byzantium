// Privacy filter for the public validator feed.
//
// Turns a raw click row into a PublicClick that is safe to publish: raw IP,
// User-Agent, headers and the full signal dump are dropped; identifiers are
// replaced with salted one-way hashes; only a deliberately small, benign subset
// of device-shape features is exposed. This is the boundary that lets us reveal
// "the clicks" for independent validation WITHOUT leaking PII or the detection
// rules. Default-closed: a field is published only if it's listed here.

import { createHmac } from "node:crypto";
import { PUBLIC_DATA_SALT } from "./config";

// Stable, non-reversible token. HMAC with a server-only salt so a published
// token can't be reversed to the raw value, and can't be cross-referenced with
// the internal fingerprint/IP unless you hold the salt.
function token(prefix: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const h = createHmac("sha256", PUBLIC_DATA_SALT).update(String(value)).digest("hex");
  return `${prefix}_${h.slice(0, 16)}`;
}

// Whitelist of benign device-shape signals safe to publish. We expose ONLY what
// an independent scorer plausibly needs to reason about a click — never raw
// IP/UA, never the bot-tell inputs (webdriver/automation/tampered/...), and
// never which detection flags fired. Add fields here deliberately.
function publicFeatures(signals: Record<string, any> | null) {
  const s = signals || {};
  const webgl = s.webgl;
  return {
    cores: typeof s.cores === "number" ? s.cores : null,
    platform: s.uaData?.platform ?? null,
    langCount: Array.isArray(s.langs) ? s.langs.length : null,
    touch: typeof s.touch === "number" ? s.touch : null,
    hasWebgl: webgl?.renderer ? true : webgl ? false : null,
  };
}

export type PublicClick = {
  id: number;
  campaign: string;
  miner: string;
  ts: string;
  device: string | null; // salted hash of the device fingerprint (no raw fp)
  network: string | null; // salted hash of the IP (no raw IP, no geo yet)
  in_app: boolean | null;
  features: ReturnType<typeof publicFeatures>;
  authenticity_score: number | null; // the private scorer's output, post-settle
};

export function toPublicClick(r: any): PublicClick {
  return {
    id: Number(r.id),
    campaign: r.campaign,
    miner: r.miner,
    ts: r.ts instanceof Date ? r.ts.toISOString() : String(r.ts),
    device: token("dev", r.fingerprint),
    network: token("net", r.ip),
    in_app: r.in_app,
    features: publicFeatures(r.signals ?? null),
    authenticity_score: r.authenticity_score ?? null,
  };
}
