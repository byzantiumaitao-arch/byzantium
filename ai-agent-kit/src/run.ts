// Launches ONE agent. `npm start [agentId]` (default agent if omitted).
//
// Generates that agent's character, gives it its own local DB dir (so several
// agents can run as separate processes without fighting), then hands off to
// ElizaOS. Run each agent in its own terminal/process.

import { spawn } from "node:child_process";
import { loadDotEnv } from "./env.ts";
import { agentIdFromArgv, writeCharacterFile } from "./agent.ts";

loadDotEnv();
const agentId = agentIdFromArgv();
const { cfg, path } = writeCharacterFile(agentId);

// Isolate each agent's pglite database by id.
process.env.PGLITE_DATA_DIR = `./.eliza/${agentId}`;

console.log(
  `Starting agent "${agentId}" — miner ${cfg.minerHandle}, ` +
    `campaign ${cfg.campaign}${cfg.account ? `, account ${cfg.account}` : ""}, ` +
    `dryRun=${cfg.posting.dryRun}\n`
);

const child = spawn("bunx", ["elizaos", "start", "--character", path], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
