// Loads and validates an agent config, and derives the tracking link.
//
// One miner can run MANY agents — each its own persona + Farcaster account, all
// sharing the same minerHandle so rewards aggregate. The DEFAULT agent lives in
// byzantium.config.json; ADDITIONAL agents live in agents/<id>.json. Each agent
// names an `account` whose Farcaster creds it reads from .env (the default agent
// uses the unsuffixed FARCASTER_* vars).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const AGENTS_DIR = join(ROOT, "agents");

export const DEFAULT_AGENT = "default";

export type MinerConfig = {
  minerHandle: string;
  campaign: string;
  linkBase: string;
  // Which Farcaster account this agent posts from. Omit for the default agent
  // (uses FARCASTER_SIGNER_UUID/FID); set e.g. "gaming" to use the suffixed
  // FARCASTER_SIGNER_UUID_GAMING / FARCASTER_FID_GAMING from .env.
  account?: string;
  farcaster: {
    channels: string[];
    replyProbability: number;
    castStyle: string;
  };
  posting: {
    maxPostsPerDay: number;
    maxCommentsPerDay: number;
    postImmediately: boolean;
    dryRun: boolean;
  };
  // Optional personality tuning. Omit to use sensible defaults.
  persona?: {
    traits?: string[]; // adjectives that shape the voice
    voice?: string[]; // extra style rules, appended to the defaults
  };
};

// Convert the human "per day" caps into the Farcaster plugin's interval knobs.
// Posts: the plugin waits a random gap in [MIN,MAX] minutes between casts, so we
// center the gap on 1440/postsPerDay and spread it ±25% for natural variation.
// Comments: the plugin processes up to MAX_ACTIONS_PROCESSING reply-actions every
// ACTION_INTERVAL minutes, so commentsPerDay sets the interval. 0 disables either.
export function rateSettings(cfg: MinerConfig): Record<string, string> {
  const posts = Math.max(0, cfg.posting.maxPostsPerDay);
  const comments = Math.max(0, cfg.posting.maxCommentsPerDay);
  const postGap = posts > 0 ? 1440 / posts : 1440;
  return {
    ENABLE_CAST: String(posts > 0),
    CAST_INTERVAL_MIN: String(Math.max(1, Math.round(postGap * 0.75))),
    CAST_INTERVAL_MAX: String(Math.max(2, Math.round(postGap * 1.25))),
    ENABLE_ACTION_PROCESSING: String(comments > 0),
    ACTION_INTERVAL: String(comments > 0 ? Math.max(1, Math.round(1440 / comments)) : 60),
    MAX_ACTIONS_PROCESSING: "1",
    FARCASTER_POLL_INTERVAL: "120", // SECONDS (plugin unit) — poll mentions every 2 min
  };
}

// Same slug rule as the link service (link-service/lib/miners.ts): handles
// double as URL path segments, so keep them clean.
const HANDLE_RE = /^[a-z0-9_-]{2,32}$/;

// Resolve a config file path for an agent id. "default" → byzantium.config.json.
export function configPath(agentId: string = DEFAULT_AGENT): string {
  return agentId === DEFAULT_AGENT
    ? join(ROOT, "byzantium.config.json")
    : join(AGENTS_DIR, `${agentId}.json`);
}

// List runnable agents: the default plus every agents/*.json file.
export function listAgents(): string[] {
  const out = [DEFAULT_AGENT];
  if (existsSync(AGENTS_DIR)) {
    for (const f of readdirSync(AGENTS_DIR)) {
      if (f.endsWith(".json")) out.push(f.slice(0, -5));
    }
  }
  return out;
}

export function loadConfig(agentId: string = DEFAULT_AGENT): MinerConfig {
  const path = configPath(agentId);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Could not read ${path}. ` +
        (agentId === DEFAULT_AGENT
          ? "Copy .env.example and run `npm run setup`."
          : `No agent "${agentId}". Known: ${listAgents().join(", ")}.`)
    );
  }
  const cfg = JSON.parse(raw) as MinerConfig;

  if (!HANDLE_RE.test(cfg.minerHandle ?? "")) {
    throw new Error(
      `minerHandle "${cfg.minerHandle}" is invalid — use 2-32 chars of [a-z0-9_-]. ` +
        `It must match the handle you registered at byzantiumai.net.`
    );
  }
  if (!cfg.campaign) throw new Error(`campaign is required in ${path}.`);
  if (!/^https?:\/\//.test(cfg.linkBase ?? "")) {
    throw new Error(`linkBase must be a full URL (got "${cfg.linkBase}").`);
  }
  return cfg;
}

export type FarcasterCreds = { apiKey: string; signerUuid: string; fid: string };

// Each agent reads its Farcaster account creds from .env. The default agent uses
// FARCASTER_SIGNER_UUID/FID; a named account "gaming" uses the _GAMING suffix.
// The Neynar API key is shared across an app's agents.
export function farcasterCreds(cfg: MinerConfig): FarcasterCreds {
  const suffix = cfg.account ? `_${cfg.account.toUpperCase()}` : "";
  return {
    apiKey: process.env.FARCASTER_NEYNAR_API_KEY?.trim() ?? "",
    signerUuid: process.env[`FARCASTER_SIGNER_UUID${suffix}`]?.trim() ?? "",
    fid: process.env[`FARCASTER_FID${suffix}`]?.trim() ?? "",
  };
}

// link.byzantiumai.net/<miner>/<campaign> — the link every click is attributed to.
export function trackingLink(cfg: MinerConfig): string {
  return `${cfg.linkBase.replace(/\/+$/, "")}/${cfg.minerHandle}/${cfg.campaign}`;
}
