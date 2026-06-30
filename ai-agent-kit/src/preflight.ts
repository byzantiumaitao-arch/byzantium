// Preflight check ("doctor") — run before going live so problems show up as
// plain English here, not as a cryptic crash deep inside the framework.
//
//   npm run check [agentId]
//
// Verifies, for one agent: an LLM key is present, the config is valid, and that
// agent's Neynar signer actually works and matches its FID. Non-zero on failure.

import { loadDotEnv, resolveLlm } from "./env.ts";
import { loadConfig, trackingLink, farcasterCreds, type MinerConfig } from "./config.ts";
import { agentIdFromArgv } from "./agent.ts";
import { getBrief } from "./campaigns.ts";

type Check = { ok: boolean; label: string; fix?: string };
const checks: Check[] = [];
function pass(label: string) { checks.push({ ok: true, label }); }
function fail(label: string, fix: string) { checks.push({ ok: false, label, fix }); }
function warn(label: string, fix: string) { checks.push({ ok: true, label: `(warn) ${label}`, fix }); }

async function main() {
  const agentId = agentIdFromArgv();

  // 1) .env present
  if (!loadDotEnv()) {
    fail(".env file", "Run `cp .env.example .env` (or `npm run setup`) and fill it in.");
  } else {
    pass(".env file found");
  }

  // 2) LLM provider key present (OpenAI or Anthropic)
  const llm = resolveLlm();
  if (llm) pass(`LLM provider: ${llm.name} (${llm.envVar} set)`);
  else fail("No LLM key", "Set OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env.");

  // 3) config valid for this agent
  let cfg: MinerConfig | null = null;
  try {
    cfg = loadConfig(agentId);
    getBrief(cfg.campaign); // throws on unknown campaign
    pass(`agent "${agentId}" valid — miner "${cfg.minerHandle}", campaign "${cfg.campaign}", account "${cfg.account ?? "default"}"`);
    pass(`tracking link: ${trackingLink(cfg)}`);
  } catch (e) {
    fail(`agent "${agentId}" config`, (e as Error).message);
  }

  // 4) this agent's Farcaster account creds (account-aware names)
  const suffix = cfg?.account ? `_${cfg.account.toUpperCase()}` : "";
  const creds = cfg ? farcasterCreds(cfg) : { apiKey: "", signerUuid: "", fid: "" };
  if (creds.apiKey) pass("FARCASTER_NEYNAR_API_KEY is set");
  else fail("FARCASTER_NEYNAR_API_KEY missing", "Add it to .env (shared across your agents).");
  if (creds.signerUuid) pass(`FARCASTER_SIGNER_UUID${suffix} is set`);
  else fail(`FARCASTER_SIGNER_UUID${suffix} missing`, `This agent's account needs its own signer. Add FARCASTER_SIGNER_UUID${suffix}=... to .env.`);
  if (creds.fid) pass(`FARCASTER_FID${suffix} is set`);
  else fail(`FARCASTER_FID${suffix} missing`, `Add FARCASTER_FID${suffix}=... to .env.`);

  // 5) live-check the signer (the part miners get wrong most often)
  if (creds.apiKey && creds.signerUuid) {
    try {
      const res = await fetch(
        `https://api.neynar.com/v2/farcaster/signer?signer_uuid=${encodeURIComponent(creds.signerUuid)}`,
        { headers: { accept: "application/json", "x-api-key": creds.apiKey } }
      );
      if (res.status === 401 || res.status === 403) {
        fail("Neynar API key rejected", "Double-check FARCASTER_NEYNAR_API_KEY in your Neynar dashboard.");
      } else if (res.status === 404) {
        fail("Neynar signer not found", `FARCASTER_SIGNER_UUID${suffix} doesn't exist under this API key. Recreate the agent in Neynar.`);
      } else if (!res.ok) {
        warn(`Neynar returned HTTP ${res.status}`, "Couldn't verify the signer right now — try again, or proceed in dryRun.");
      } else {
        const data: any = await res.json();
        const status = data?.status ?? "unknown";
        if (status !== "approved") {
          fail(`Neynar signer status is "${status}"`, "Approve/register the signer for this account in Neynar, then re-run.");
        } else {
          pass("Neynar signer approved");
          if (creds.fid && String(data?.fid) !== creds.fid) {
            fail("FID mismatch", `Signer belongs to FID ${data?.fid}, but FARCASTER_FID${suffix}=${creds.fid}. Fix it to ${data?.fid}.`);
          } else if (creds.fid) {
            pass(`FID ${creds.fid} matches signer`);
          }
        }
      }
    } catch {
      warn("Couldn't reach Neynar", "Network issue — skipping live signer check. Safe to dry-run offline.");
    }
  }

  report(agentId);
}

function report(agentId: string) {
  console.log(`\nByzantium AI Agent Kit — preflight (agent "${agentId}")\n`);
  let hardFail = false;
  for (const c of checks) {
    const mark = c.ok ? (c.label.startsWith("(warn)") ? "•" : "✓") : "✗";
    console.log(`  ${mark} ${c.label}`);
    if (c.fix) console.log(`      → ${c.fix}`);
    if (!c.ok) hardFail = true;
  }
  if (hardFail) {
    console.log("\nNot ready yet — fix the ✗ items above, then run `npm run check` again.\n");
    process.exit(1);
  }
  console.log(`\nAll good. Preview with \`npm run build:character ${agentId === "default" ? "" : agentId}\`, then \`npm start ${agentId === "default" ? "" : agentId}\`.\n`);
}

main();
