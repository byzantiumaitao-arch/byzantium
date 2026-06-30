// Service configuration.
//
// Per-campaign destinations live in lib/campaigns.ts. This file only holds
// service-wide settings.

// Where to send people who hit the bare root, an unknown campaign, or a
// single-segment (un-attributable) path.
export const MARKETING_URL =
  process.env.MARKETING_URL || "https://byzantiumai.net";

// ---- Public validator feed (/api/validator/*) ----

// How long after a click is scored before its data + score may be published.
// The delay is the anti-gaming gate: validators get full per-click transparency,
// but only once rewards for that click have settled, so miners can't read the
// feed to tune fraud in real time. Tunable per environment.
export const PUBLIC_REVEAL_DELAY_HOURS = Number(
  process.env.PUBLIC_REVEAL_DELAY_HOURS ?? 24
);

// Server-only salt for the one-way hashes in the public feed (device/network
// tokens). Keep it secret and stable: rotating it re-anonymises everything, and
// leaking it lets people reverse published tokens back to raw fingerprints/IPs.
export const PUBLIC_DATA_SALT = process.env.PUBLIC_DATA_SALT || "";
