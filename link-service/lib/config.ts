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
export const WEIGHTS_WINDOW_DAYS = Number(process.env.WEIGHTS_WINDOW_DAYS ?? 14);

// Server-only salt for the one-way hashes in the public feed (device/network
// tokens). Keep it secret and stable: rotating it re-anonymises everything, and
// leaking it lets people reverse published tokens back to raw fingerprints/IPs.
export const PUBLIC_DATA_SALT = process.env.PUBLIC_DATA_SALT || "";

// Burn address (Bittensor SS58 hotkey). Weight earned by miners who haven't set a
// payout hotkey is routed here instead of being redistributed — so unclaimed
// rewards are set aside, and every registered miner keeps exactly their own share.
// This is a Byzantium-controlled hotkey REGISTERED on SN76 that we simply never
// spend from (a soft burn), so its emissions accumulate untouched.
export const BURN_HOTKEY = process.env.BURN_HOTKEY || "";
