// Service configuration.
//
// Per-campaign destinations live in lib/campaigns.ts. This file only holds
// service-wide settings.

// Where to send people who hit the bare root, an unknown campaign, or a
// single-segment (un-attributable) path.
export const MARKETING_URL =
  process.env.MARKETING_URL || "https://byzantiumai.net";
