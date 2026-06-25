// One-shot schema migration for the clicks table.
//
// Run:  node --env-file=.env.local scripts/migrate.mjs
//
// Idempotent — safe to run repeatedly (CREATE ... IF NOT EXISTS). Run again
// against production after setting DATABASE_URL to the prod connection string.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ DATA SAFETY — READ BEFORE EDITING                                         │
// │ This database holds real miner accounts and click history. NEVER add a    │
// │ destructive statement here: no DROP TABLE, no TRUNCATE, no DELETE, no      │
// │ ALTER ... DROP COLUMN. Migrations must only ADD (CREATE TABLE/INDEX IF    │
// │ NOT EXISTS, ADD COLUMN). To change a column, add a new one and backfill.  │
// │ An independent append-only backup runs every 5 min to /Volumes/External   │
// │ (see ~/byzantium-backup/) — but that is a safety net, not a licence to    │
// │ run destructive SQL.                                                      │
// └─────────────────────────────────────────────────────────────────────────┘

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

  // Rich device/behaviour signals gathered by the interstitial collector
  // (lib/fingerprint.ts) after the header-only click row is inserted. The full
  // component dump lives in `signals` (jsonb); the high-value bits are also kept
  // in their own columns for fast querying. Idempotent ALTERs so re-running is safe.
  `ALTER TABLE clicks ADD COLUMN IF NOT EXISTS signals JSONB`,
  `CREATE INDEX IF NOT EXISTS clicks_fingerprint_idx ON clicks (fingerprint)`,
  `CREATE INDEX IF NOT EXISTS clicks_visitor_idx     ON clicks (visitor_id)`,

  // Miner accounts. handle is the link slug (/<handle>/<campaign>).
  `CREATE TABLE IF NOT EXISTS miners (
     id            BIGSERIAL PRIMARY KEY,
     handle        TEXT        NOT NULL UNIQUE,
     email         TEXT        NOT NULL UNIQUE,
     password_hash TEXT        NOT NULL,
     display_name  TEXT,
     status        TEXT        NOT NULL DEFAULT 'active',
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  // Linked social handles, verified by proof-of-post.
  `CREATE TABLE IF NOT EXISTS miner_socials (
     id          BIGSERIAL PRIMARY KEY,
     miner_id    BIGINT      NOT NULL REFERENCES miners(id) ON DELETE CASCADE,
     platform    TEXT        NOT NULL,             -- 'x' | 'farcaster'
     handle      TEXT        NOT NULL,             -- their @handle on that platform
     code        TEXT        NOT NULL,             -- verification nonce to post
     post_url    TEXT,                             -- the proof post they submitted
     status      TEXT        NOT NULL DEFAULT 'pending', -- pending|verified|rejected
     verified_at TIMESTAMPTZ,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (miner_id, platform)
   )`,
  // A verified handle can only belong to one miner.
  `CREATE UNIQUE INDEX IF NOT EXISTS miner_socials_verified_handle_idx
     ON miner_socials (platform, lower(handle)) WHERE status = 'verified'`,
];

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("✓", stmt.split("\n")[0].trim());
}

const [{ count }] = await sql.query("SELECT count(*)::int AS count FROM clicks");
console.log(`\nMigration complete. clicks table ready (${count} rows).`);
