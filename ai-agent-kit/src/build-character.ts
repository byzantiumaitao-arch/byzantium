// Preview an agent before you run it: `npm run build:character [agentId]`.
//
// Builds the agent's character (persona, rules, example posts), writes it to
// .characters/<id>.json, and prints it with secrets redacted. Posts nothing.

import { loadDotEnv } from "./env.ts";
import { trackingLink } from "./config.ts";
import { agentIdFromArgv, writeCharacterFile } from "./agent.ts";

loadDotEnv();
const agentId = agentIdFromArgv();
const { cfg, character, path } = writeCharacterFile(agentId);

// Redact the per-agent credentials before printing.
const shown: any = JSON.parse(JSON.stringify(character));
if (shown.settings?.secrets) shown.settings.secrets = "<redacted>";

console.log(`\n=== Byzantium agent "${agentId}" ===\n`);
console.log(`Miner handle : ${cfg.minerHandle}`);
console.log(`Campaign     : ${cfg.campaign}`);
console.log(`Account      : ${cfg.account ?? "(default)"}`);
console.log(`Tracking link: ${trackingLink(cfg)}`);
console.log(`Dry run      : ${cfg.posting.dryRun}  (true = generates but does NOT post)`);
console.log("\n--- character (secrets redacted) ---\n");
console.log(JSON.stringify(shown, null, 2));
console.log(`\nWrote ${path}.`);
console.log(`Run it with: npm start ${agentId === "default" ? "" : agentId}\n`);
