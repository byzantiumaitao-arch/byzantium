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

  // Per-click authenticity score, written by the PRIVATE scoring service (not in
  // this repo). authenticity_score ∈ [0,1]; scored_at stamps when it was set.
  // The public validator feed (/api/validator/*) only ever reads these — it never
  // computes them. A NULL score = not yet judged. We never expose the raw signals
  // that produced the score, only the score itself, and only after a settle delay.
  `ALTER TABLE clicks ADD COLUMN IF NOT EXISTS authenticity_score REAL`,
  `ALTER TABLE clicks ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS clicks_scored_at_idx ON clicks (scored_at)`,

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
  // Bittensor hotkey (SS58 payout address) the miner pastes at signup. Nullable
  // so pre-existing accounts aren't broken; new signups require it. Rewards are
  // paid direct to this key by on-chain weight (handle → hotkey → UID).
  `ALTER TABLE miners ADD COLUMN IF NOT EXISTS hotkey TEXT`,

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

  // Campaigns: where each link redirects. Admin-managed; the miner link builder
  // and the redirect handler read from here, so adding a campaign instantly makes
  // it available to every miner without a code change.
  `CREATE TABLE IF NOT EXISTS campaigns (
     slug        TEXT        PRIMARY KEY,
     name        TEXT        NOT NULL,
     destination TEXT        NOT NULL,
     active      BOOLEAN     NOT NULL DEFAULT true,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
];

for (const stmt of statements) {
  await sql.query(stmt);
  console.log("✓", stmt.split("\n")[0].trim());
}

// Seed the two original campaigns once (only if the table is empty), so existing
// links keep working. ON CONFLICT keeps this idempotent and non-destructive.
await sql`
  INSERT INTO campaigns (slug, name, destination, active) VALUES
    ('launch', 'Byzantium — awareness', 'https://byzantiumai.net', true),
    ('buy',    'Buy ن on Taostats',     'https://taostats.io',     true)
  ON CONFLICT (slug) DO NOTHING
`;

const [{ count }] = await sql.query("SELECT count(*)::int AS count FROM clicks");
const [{ count: camps }] = await sql.query("SELECT count(*)::int AS count FROM campaigns");
console.log(`\nMigration complete. clicks=${count} rows, campaigns=${camps}.`);
