// Shared helpers for the agent entrypoints (run / preview).

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadConfig, DEFAULT_AGENT, type MinerConfig } from "./config.ts";
import { buildCharacter, type Character } from "./character.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The agent id is the first non-flag CLI arg, e.g. `npm start gaming`.
// Falls back to the default agent (byzantium.config.json).
export function agentIdFromArgv(): string {
  return process.argv.slice(2).find((a) => !a.startsWith("-")) ?? DEFAULT_AGENT;
}

// Generate the agent's character and write it where ElizaOS will load it from.
// One file per agent so several agents can run as separate processes.
export function writeCharacterFile(agentId: string): {
  cfg: MinerConfig;
  character: Character;
  path: string;
} {
  const cfg = loadConfig(agentId);
  const character = buildCharacter(cfg);
  const dir = join(ROOT, ".characters");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${agentId}.json`);
  writeFileSync(path, JSON.stringify(character, null, 2) + "\n");
  return { cfg, character, path };
}
