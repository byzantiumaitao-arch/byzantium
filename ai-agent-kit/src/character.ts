// Builds the ElizaOS Character from the miner's config + the campaign brief.
//
// This is where the agent "learns how to advertise": the brief becomes the
// persona's knowledge, the tracking link becomes the thing it shares, and the
// system rules below align it with how Byzantium actually pays — only GENUINE
// human clicks are rewarded, so spam is literally worthless to the miner.

import type { MinerConfig } from "./config.ts";
import { trackingLink, rateSettings, farcasterCreds } from "./config.ts";
import { resolveLlm } from "./env.ts";
import { getBrief, type CampaignBrief } from "./campaigns.ts";

// Loosely typed to stay compatible across @elizaos/core minor versions.
export type Character = Record<string, unknown>;

export function buildCharacter(cfg: MinerConfig): Character {
  const brief = getBrief(cfg.campaign);
  const link = trackingLink(cfg);

  // Pick the LLM plugin from whichever provider key is set (defaults to OpenAI
  // for the preview when no key is present yet).
  const llmPlugin = resolveLlm()?.plugin ?? "@elizaos/plugin-openai";

  const creds = farcasterCreds(cfg);

  return {
    // Unique per agent (a miner can run several), e.g. byz-alice-launch.
    name: `byz-${cfg.minerHandle}-${cfg.account ?? cfg.campaign}`,
    plugins: [
      "@elizaos/plugin-sql",
      llmPlugin,
      "@elizaos/plugin-bootstrap",
      "@elizaos/plugin-farcaster",
    ],

    // The Farcaster plugin reads these via runtime.getSetting() (character
    // settings take precedence over env). Strings, matching plugin expectations.
    settings: {
      // Per-agent Farcaster account creds — this is what lets one miner run
      // several agents on different accounts from separate processes.
      secrets: {
        FARCASTER_NEYNAR_API_KEY: creds.apiKey,
        FARCASTER_SIGNER_UUID: creds.signerUuid,
        FARCASTER_FID: creds.fid,
      },
      FARCASTER_DRY_RUN: String(cfg.posting.dryRun),
      CAST_IMMEDIATELY: String(cfg.posting.postImmediately),
      // Posts/day + comments/day → the plugin's interval knobs.
      ...rateSettings(cfg),
      farcaster: {
        channels: cfg.farcaster.channels,
        replyProbability: cfg.farcaster.replyProbability,
        castStyle: cfg.farcaster.castStyle,
      },
    },

    system: systemPrompt(brief, link),
    bio: bio(brief),
    topics: brief.topics,
    adjectives: cfg.persona?.traits?.length
      ? cfg.persona.traits
      : ["knowledgeable", "genuine", "helpful", "concise"],
    style: style(brief, cfg.persona?.voice ?? []),

    // Seed posts so the model has concrete examples of the voice we want.
    postExamples: brief.angles.map((angle) => examplePost(angle, link)),
  };
}

function systemPrompt(brief: CampaignBrief, link: string): string {
  return [
    `You are a Byzantium miner promoting "${brief.name}" on Farcaster.`,
    ``,
    `WHAT YOU PROMOTE:`,
    brief.brief,
    `Your tracking link is ${link} — this is how your work is measured and rewarded.`,
    ``,
    `HOW YOU GET PAID (read this — it changes how you should behave):`,
    `Byzantium rewards you ONLY for genuine human clicks. Clicks that look automated,`,
    `incentivized, or spammy are detected and discarded — you earn nothing for them, and`,
    `aggressive spamming gets your account suspended. So your incentive is to be genuinely`,
    `worth reading. A great reply that earns one real curious click beats a hundred ignored ones.`,
    ``,
    `HOW YOU POST:`,
    `- Talk about the topics above as a knowledgeable peer. Lead with something useful or interesting.`,
    `- Share the link when it genuinely fits — not in every post. When you do, make it a natural next step,`,
    `  not a demand. Never write "click here", "🔗 link in bio", or hashtag spam.`,
    `- Rotate between these angles so you don't repeat yourself: ${brief.angles.join(" | ")}`,
    ``,
    `HOW YOU REPLY:`,
    `- Only reply where you can add real value to the conversation.`,
    `- Answer the person first. Only mention Byzantium / the link if it's actually relevant to what they said.`,
    `- One reply per conversation. Do not follow up repeatedly. Do not reply to obvious bots.`,
    ``,
    `TONE: ${brief.tone}.`,
  ].join("\n");
}

function bio(brief: CampaignBrief): string[] {
  return [
    `A Byzantium miner sharing what's interesting about ${brief.topics.slice(0, 3).join(", ")}.`,
    brief.brief,
  ];
}

function style(brief: CampaignBrief, extraVoice: string[]): Record<string, string[]> {
  const rules = [
    "Write like a real person, not a brand account.",
    "Lead with value; the link is a P.S., not the point.",
    "Keep it short and specific. No hype, no emoji spam, no hashtag walls.",
    "Never beg for clicks. Make people curious instead.",
    `Stay on-topic: ${brief.topics.join(", ")}.`,
    ...extraVoice, // miner's own voice rules from byzantium.config.json
  ];
  return { all: rules, chat: rules, post: rules };
}

function examplePost(angle: string, link: string): string {
  // A template the model adapts — shows the shape: insight first, link as a soft close.
  return `${angle}\n\nIf that's a rabbit hole you want to go down: ${link}`;
}
