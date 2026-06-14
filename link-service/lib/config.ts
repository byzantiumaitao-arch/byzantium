// Service configuration.

// Where every link 302s to. In Phase 1 every miner's link points at the same
// Taostats "buy ن" destination; per-miner / per-post destinations come later.
// Override in Vercel with the LINK_DESTINATION env var without touching code.
export const DESTINATION_URL =
  process.env.LINK_DESTINATION || "https://taostats.io";

// Where to send people who hit the bare root or an obviously-non-slug path.
export const MARKETING_URL =
  process.env.MARKETING_URL || "https://byzantiumai.net";

// Paths that must never be treated as a miner slug.
export const RESERVED_SLUGS = new Set([
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "_next",
  "health",
]);
