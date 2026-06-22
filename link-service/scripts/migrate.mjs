// One-shot schema migration for the clicks table.
//
// Run:  node --env-file=.env.local scripts/migrate.mjs
//
// Idempotent — safe to run repeatedly (CREATE ... IF NOT EXISTS). Run again
// against production after setting DATABASE_URL to the prod connection string.

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Run with: node --env-file=.env.local scripts/migrate.mjs");
  process.exit(1);
}

const sql = neon(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS clicks (
     id          BIGSERIAL PRIMARY KEY,
     campaign    TEXT        NOT NULL,
     miner       TEXT        NOT NULL,
     ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
     ip          TEXT,
     ua          TEXT,
     accept_lang TEXT,
     referer     TEXT,
     fingerprint TEXT,
     visitor_id  TEXT,
     in_app      BOOLEAN
   )`,
  `CREATE INDEX IF NOT EXISTS clicks_campaign_ts_idx ON clicks (campaign, ts DESC)`,
  `CREATE INDEX IF NOT EXISTS clicks_miner_ts_idx    ON clicks (miner, ts DESC)`,
  `CREATE INDEX IF NOT EXISTS clicks_ts_idx          ON clicks (ts DESC)`,
];

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("✓", stmt.split("\n")[0].trim());
}

const [{ count }] = await sql.query("SELECT count(*)::int AS count FROM clicks");
console.log(`\nMigration complete. clicks table ready (${count} rows).`);
