// Tiny shared helper: load .env for the standalone scripts (setup, check).
//
// `elizaos start` loads .env on its own, but our helper scripts run under plain
// tsx, so they read it here. Node 20.12+/24 ships process.loadEnvFile — no dep.

import { existsSync } from "node:fs";

export function loadDotEnv(path = ".env"): boolean {
  if (!existsSync(path)) return false;
  try {
    // process.loadEnvFile is available on Node >=20.12 (cast in case types lag).
    (process as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(path);
    return true;
  } catch {
    return false;
  }
}

export const REQUIRED_FARCASTER_ENV = [
  "FARCASTER_NEYNAR_API_KEY",
  "FARCASTER_SIGNER_UUID",
  "FARCASTER_FID",
] as const;

// The agent's LLM "brain" — bring your own provider. We pick the ElizaOS plugin
// from whichever key is set, so a miner only needs one of these.
export type LlmProvider = { plugin: string; envVar: string; name: string };

export function resolveLlm(): LlmProvider | null {
  if (process.env.OPENAI_API_KEY?.trim())
    return { plugin: "@elizaos/plugin-openai", envVar: "OPENAI_API_KEY", name: "OpenAI" };
  if (process.env.ANTHROPIC_API_KEY?.trim())
    return { plugin: "@elizaos/plugin-anthropic", envVar: "ANTHROPIC_API_KEY", name: "Anthropic" };
  return null;
}
