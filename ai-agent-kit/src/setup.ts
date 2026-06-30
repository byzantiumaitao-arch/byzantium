// Guided setup — walks a miner through the keys and writes .env + config.
//
//   npm run setup
//
// Asks one question at a time, keeps your existing answers as defaults, and
// never prints secrets back. After writing, point them at `npm run check`.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { CAMPAIGNS } from "./campaigns.ts";

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (q: string, def = "") => {
  const hint = def ? ` [${def}]` : "";
  const a = (await rl.question(`${q}${hint}: `)).trim();
  return a || def;
};

function readEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  if (existsSync(".env")) {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}

async function main() {
  console.log("\nByzantium AI Agent Kit — setup\n");
  console.log("You'll need: an LLM key (OpenAI or Anthropic), and from neynar.com an API key + a signer (UUID + FID).");
  console.log("Press Enter to keep an existing value shown in [brackets].\n");

  const env = readEnv();
  const campaignList = Object.keys(CAMPAIGNS).join(", ");

  // Identity
  const minerHandle = await ask("Your registered Byzantium handle", "");
  const campaign = await ask(`Campaign to promote (${campaignList})`, Object.keys(CAMPAIGNS)[0]);

  // Keys (keep existing as default so re-runs don't force re-entry)
  const openai = await ask("OpenAI API key (Enter to skip)", env.OPENAI_API_KEY ?? "");
  const anthropic = openai
    ? env.ANTHROPIC_API_KEY ?? ""
    : await ask("Anthropic API key (Enter to skip)", env.ANTHROPIC_API_KEY ?? "");
  const neynarKey = await ask("Neynar API key", env.FARCASTER_NEYNAR_API_KEY ?? "");
  const signer = await ask("Neynar signer UUID", env.FARCASTER_SIGNER_UUID ?? "");
  const fid = await ask("Your Farcaster FID", env.FARCASTER_FID ?? "");

  // Write .env
  const envOut = [
    `OPENAI_API_KEY=${openai}`,
    `ANTHROPIC_API_KEY=${anthropic}`,
    `FARCASTER_NEYNAR_API_KEY=${neynarKey}`,
    `FARCASTER_SIGNER_UUID=${signer}`,
    `FARCASTER_FID=${fid}`,
    `PGLITE_DATA_DIR=./.eliza/.elizadb`,
    "",
  ].join("\n");
  writeFileSync(".env", envOut);

  // Merge identity into config, preserving other fields/defaults
  const cfgPath = "byzantium.config.json";
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
  cfg.minerHandle = minerHandle;
  cfg.campaign = campaign;
  cfg.linkBase ??= "https://link.byzantiumai.net";
  cfg.farcaster ??= { channels: ["/bittensor", "/ai", "/crypto"], replyProbability: 0.6, castStyle: "conversational" };
  cfg.posting ??= { maxPostsPerDay: 8, maxCommentsPerDay: 12, postImmediately: false, dryRun: true };
  cfg.persona ??= { traits: ["knowledgeable", "genuine", "helpful", "concise"], voice: ["Sound like a curious builder, not a marketer."] };
  cfg.posting.dryRun ??= true; // always default to safe
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");

  rl.close();
  console.log("\nWrote .env and byzantium.config.json.");
  console.log("dryRun is ON — the agent won't post until you turn it off.\n");
  console.log("Next:\n  npm run check            # verify your keys work\n  npm run build:character  # preview what it'll say\n  npm start                # run it (still dry until you flip dryRun)\n");
}

main();
