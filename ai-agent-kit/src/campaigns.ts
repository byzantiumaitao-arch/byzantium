// Campaign briefs — what the agent is advertising, and how.
//
// This mirrors the brand-controlled campaign registry on the Byzantium side
// (link-service/lib/campaigns.ts). A *brief* is the message strategy the agent
// follows: the topic to talk about, the tone to use, and a set of distinct
// "angles" it rotates through so it never repeats itself.
//
// Phase 1 ships briefs in the kit. Later these are fetched from the Byzantium
// API per campaign so brands can update the message without a code change.

export type CampaignBrief = {
  /** Campaign slug — must match the slug in your tracking link's path. */
  slug: string;
  /** Human name for the campaign. */
  name: string;
  /** Where the link ultimately sends people (for the agent's understanding). */
  destination: string;
  /** One-paragraph description of what's being promoted and why people care. */
  brief: string;
  /** Topics/keywords the agent looks for in conversations worth replying to. */
  topics: string[];
  /** The voice. Keep it human and useful — salesy copy gets flagged as a bot. */
  tone: string;
  /** Distinct framings the agent rotates between so posts stay varied. */
  angles: string[];
};

export const CAMPAIGNS: Record<string, CampaignBrief> = {
  launch: {
    slug: "launch",
    name: "Byzantium launch",
    destination: "https://byzantiumai.net",
    brief:
      "Byzantium is a decentralized AI marketing agency built as a Bittensor subnet. " +
      "Anyone can become a miner: you share a tracking link, drive real human attention, " +
      "and the network measures genuine clicks and rewards the people who deliver them. " +
      "It turns marketing into an open, permissionless, pay-for-real-results network.",
    topics: [
      "bittensor",
      "tao",
      "decentralized ai",
      "crypto marketing",
      "attention economy",
      "subnets",
      "earn crypto",
    ],
    tone: "informed, curious, helpful — a knowledgeable peer, never a billboard",
    angles: [
      "The data/ownership angle: marketing budgets today vanish into ad networks you don't control — what if the network were open?",
      "The earn angle: you already share links and drive traffic for free; here you get rewarded for genuine clicks.",
      "The builder angle: Byzantium is a Bittensor subnet — explain how the incentive mechanism rewards real human attention over bots.",
      "The skeptic angle: most 'click' metrics are gamed; talk about why measuring *genuine* human clicks is the hard, interesting problem.",
    ],
  },

  taostats: {
    slug: "taostats",
    name: "Taostats analytics",
    destination: "https://taostats.io",
    brief:
      "Taostats is the analytics explorer for the Bittensor network — subnet metrics, " +
      "validator/miner stats, TAO price and emissions, and on-chain data for the whole " +
      "ecosystem. The place to actually understand what's happening across subnets.",
    topics: ["bittensor", "tao", "subnets", "validators", "emissions", "on-chain data", "analytics"],
    tone: "precise, data-driven, analytical — like a sharp on-chain researcher",
    angles: [
      "The data angle: point at a concrete subnet metric or trend worth watching, and where to verify it.",
      "The newcomer angle: explain how to read subnet emissions / validator stats without the jargon.",
      "The researcher angle: surface a non-obvious pattern in the on-chain data and why it matters.",
    ],
  },
};

export function getBrief(slug: string): CampaignBrief {
  const b = CAMPAIGNS[slug];
  if (!b) {
    const known = Object.keys(CAMPAIGNS).join(", ");
    throw new Error(
      `Unknown campaign "${slug}". Known campaigns: ${known}. ` +
        `Set "campaign" in byzantium.config.json to one of these.`
    );
  }
  return b;
}
