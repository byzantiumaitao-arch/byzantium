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

// Weights are a rolling window of recent settled clicks, so a miner who goes
// quiet for a few days still earns (their older clicks age out gradually) and a
// fully inactive miner decays to 0. Tunable per environment.
export const WEIGHTS_WINDOW_DAYS = Number(process.env.WEIGHTS_WINDOW_DAYS ?? 30);

// Server-only salt for the one-way hashes in the public feed (device/network
// tokens). Keep it secret and stable: rotating it re-anonymises everything, and
// leaking it lets people reverse published tokens back to raw fingerprints/IPs.
export const PUBLIC_DATA_SALT = process.env.PUBLIC_DATA_SALT || "";

// Social handle linking / proof-of-post verification (X, Farcaster). Off by
// default: with one-miner-per-link attribution by hotkey, a miner verifying
// their *own* social account adds nothing to payout, so the flow is hidden from
// the miner dashboard, the /m/verify page, and the miner guide. The backend
// (lib/socials.ts, the miner_socials table, and admin review) stays wired — set
// SOCIAL_LINKING_ENABLED=true to re-expose the UI without any code changes.
export const SOCIAL_LINKING_ENABLED =
  (process.env.SOCIAL_LINKING_ENABLED ?? "false") === "true";

// Burn address (Bittensor SS58 hotkey). Weight earned by miners who haven't set a
// payout hotkey is routed here instead of being redistributed — so unclaimed
// rewards are set aside, and every registered miner keeps exactly their own share.
// This is a Byzantium-controlled hotkey REGISTERED on SN76 that we simply never
// spend from (a soft burn), so its emissions accumulate untouched.
//
// TEMPORARY — pointed at the key below while the permanent burn hotkey
// (5FNvEXaiumHtm3iqKDBvjCgGhAuPzwsdNpM3Rs2mwwAuYVZF) is not yet registered on
// SN76. This is a stopgap and WILL BE CHANGED BACK once that key is registered.
// Caveat: 5Crak… is registered on SN92 (wgmi), not SN76, so a weight_copy
// validator cannot resolve it to a UID until it is also registered on SN76.
const TEMP_BURN_HOTKEY = "5CrakAiUXovkwYT8E7Gz7ovuHiLrb15XwrLpfTyH65zaR8xg";

export const BURN_HOTKEY = process.env.BURN_HOTKEY || TEMP_BURN_HOTKEY;
