# Byzantium link service

The redirect, attribution, and validator-transparency layer behind
**`link.byzantiumai.net`** — the public half of Byzantium (Bittensor **subnet 76**),
a decentralized marketing subnet. Miners share tracking links; genuine human
clicks earn weight; validators read those weights from this service and set them
on-chain.

## The link

```
link.byzantiumai.net/<miner>/<campaign>
  → look up the campaign's destination
  → log the click, attributed to (miner, campaign)
  → forward the visitor to the destination

e.g.  link.byzantiumai.net/alice/launch  →  https://byzantiumai.net
```

Each **campaign** has its own destination URL. Each click records **which
campaign** (what's being marketed) and **which miner** (who to credit).

## How a click becomes on-chain weight

1. **Redirect** — logs the click and forwards the visitor to the campaign's destination.
2. **Authenticity** — every click is judged genuine-or-not by a **separate, private**
   component (see *Private by design*). Only genuine clicks count toward rewards.
3. **Weights** — `GET /api/validator/weights` publishes each miner's share of its
   genuine clicks, normalised to 1.0, with the miner's payout hotkey. Validators
   copy these on-chain.

### Private by design

Two things are deliberately **not** documented here or exposed in the v1 API,
because revealing them would let people game the rewards:

- **Authenticity scoring** — *how* a click is judged genuine. A separate, private
  component; never published.
- **The in-browser signal collection** that feeds it, and the per-click data it
  produces.

The public surface in v1 is the **redirect**, the **campaign registry**, the
**dashboards**, and the **aggregate weights**. Per-click transparency — an
anonymized, auditable click feed — is planned for **v2**.

## What's here

| Path | What it does |
|---|---|
| `app/[miner]/[campaign]/route.ts` | The redirect. Logs the click, forwards to the campaign destination. |
| `app/[miner]/route.ts` | Single-segment path (no campaign) → marketing site; not a tracking link. |
| `app/api/validator/weights/route.ts` | **Public validator feed** — per-miner reward weights (all a weight-copy validator needs). |
| `app/api/clicks/route.ts` | Raw click feed — **admin-only** (auth required). |
| `app/dashboard` · `app/m` · `app/admin` | Public campaign overview · miner dashboard · admin console. |
| `app/signup` · `app/login` | Miner accounts. |
| `lib/campaigns.ts` | Campaign registry (Postgres): slug → destination; managed at `/admin`. |
| `lib/db.ts` · `lib/clicks.ts` | Click storage — real **Neon Postgres**, append-only. |
| `lib/miners.ts` · `lib/auth.ts` | Miner accounts + session auth (miner / admin). |
| `lib/weights.ts` · `lib/publicfeed.ts` | The public weight formula + its settled-click read queries. |
| `lib/wallet.ts` | Bittensor **SS58** hotkey validation. |
| `lib/ratelimit.ts` · `lib/config.ts` | Per-IP flood backstop · service settings. |

## Validator API

`GET /api/validator/weights` → per-miner weights, normalised to sum 1.0:

```jsonc
{
  "generated_at": "2026-…",
  "reveal_delay_hours": 24,       // a click's score is public only after it settles
  "count": 3,
  "weights": [
    { "miner": "alice", "weight": 0.42, "score_sum": 21, "scored_clicks": 21,
      "hotkey": "5F…", "burn": false }
    // a miner with no payout hotkey → "burn": true, weight routed to the burn hotkey
  ]
}
```

A weight-copy validator polls this each epoch and `set_weights` against each
row's `hotkey`, summing `burn:true` rows onto the single burn hotkey. A weight is
the miner's share of its genuine-click scores over a rolling `WEIGHTS_WINDOW_DAYS`
window, published only after `PUBLIC_REVEAL_DELAY_HOURS` (so scores can't be read
in real time to tune fraud).

## Storage

Real **Neon Postgres** via the serverless HTTP driver (`lib/db.ts`). Schema +
migrations in `scripts/migrate.mjs`:

```bash
node --env-file=.env.local scripts/migrate.mjs
```

Click rows are **append-only** — never mutated or deleted destructively.

## Configuration (Vercel env vars)

| Var | Meaning |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string — **required**. |
| `AUTH_SECRET` | Signs session cookies. |
| `ADMIN_PASSWORD` | Unlocks the admin console + the admin-only click feed. |
| `MARKETING_URL` | Where bare-root / unknown-campaign hits go (default `https://byzantiumai.net`). |
| `PUBLIC_REVEAL_DELAY_HOURS` | Settle delay before a click's score is published (default `24`). |
| `WEIGHTS_WINDOW_DAYS` | Rolling window weights are computed over (default `30`). |
| `PUBLIC_DATA_SALT` | Salt for anonymized public tokens — set a strong, stable value. |
| `BURN_HOTKEY` | Soft-burn hotkey; unpayable (no-hotkey) weight routes here. |
| `RATE_LIMIT_MAX` · `RATE_LIMIT_WINDOW_MS` | Per-IP flood backstop on the hot paths (default `120` / `60000`). |

## Development & deploy

Requires a `.env.local` with `DATABASE_URL` (and the private authenticity
components, which are not part of this repo — so it isn't a standalone build):

```bash
npm install
npm run dev          # http://localhost:3000
```

Runs in production as its **own** Vercel project (separate from the marketing
site for uptime isolation), behind `link.byzantiumai.net` (Cloudflare CNAME,
DNS-only), deployed from the maintainers' environment.
