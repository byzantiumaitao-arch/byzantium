// `npm run agents` — list every agent this kit can run.

import { loadDotEnv } from "./env.ts";
import { listAgents, loadConfig, trackingLink, farcasterCreds } from "./config.ts";

loadDotEnv();

console.log("\nAgents in this kit:\n");
for (const id of listAgents()) {
  try {
    const cfg = loadConfig(id);
    const creds = farcasterCreds(cfg);
    const acct = cfg.account ?? "(default)";
    const ready = creds.signerUuid && creds.fid ? "✓ creds set" : "✗ missing creds";
    console.log(`  ${id.padEnd(12)} campaign=${cfg.campaign}  account=${acct}  ${ready}`);
    console.log(`  ${" ".repeat(12)} link=${trackingLink(cfg)}`);
  } catch (e) {
    console.log(`  ${id.padEnd(12)} ERROR: ${(e as Error).message}`);
  }
}
console.log("\nRun one with:  npm start <id>   (e.g. npm start default)\n");
