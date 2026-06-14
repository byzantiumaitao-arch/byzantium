# Byzantium link service

The redirect + click-logging service behind **`link.byzantiumai.net`**.

```
link.byzantiumai.net/<miner>/<campaign>
  → look up the campaign's destination
  → log the click (append-only), attributed to (miner, campaign)
  → 302 → the campaign's target site

e.g.  link.byzantiumai.net/alice/launch  → https://byzantiumai.net
      link.byzantiumai.net/alice/buy     → https://taostats.io
```

Each **campaign** has its own destination URL; each click records which campaign
(what's being marketed) and which miner (who to reward). The device-fingerprint
interstitial and the real Postgres click table slot in later without changing
this behaviour.

## What's here

| Path | What it does |
|---|---|
| `app/[miner]/[campaign]/route.ts` | The redirect. Logs the click, 302s to the campaign's destination. |
| `app/[miner]/route.ts` | Single-segment (no campaign) → marketing site; not a valid tracking link. |
| `app/api/clicks/route.ts` | Read feed of recent clicks (`?campaign=` / `?miner=` to filter). |
| `lib/campaigns.ts` | **Campaign registry — campaign → destination.** Currently a stub map; becomes a DB lookup later. |
| `lib/clicks.ts` | **Storage layer — the only file that changes for a real DB.** Currently stubbed (logs + in-memory). |
| `lib/config.ts` | Service-wide settings (marketing URL). |

## Campaigns

Add or edit campaigns in `lib/campaigns.ts` — each has a `slug`, `name`,
`destination`, and `active` flag. Later this moves to the database / an admin UI
so brands can launch campaigns without a code change.

## Storage: stubbed for now

While stubbed, every click is:
1. Written to the **Vercel log stream** as a JSON line (the durable record) — view with `vercel logs <deployment>`.
2. Kept in an **in-memory** buffer that powers `GET /api/clicks` (resets on cold start; great locally).

Moving to real Postgres = swap the two function bodies in `lib/clicks.ts` for an
`INSERT` and a `SELECT`. The append-only contract and the row shape stay
identical, so nothing else changes.

## Run locally

```bash
cd link-service
npm install
npm run dev          # http://localhost:3000
```

Test it:
```bash
curl -sI localhost:3000/alice/launch          # → 302 Location: https://byzantiumai.net
curl -sI localhost:3000/alice/buy             # → 302 Location: https://taostats.io
curl -s  localhost:3000/api/clicks | jq       # → the clicks you just made
```

## Configuration (Vercel env vars, all optional)

| Var | Default | Meaning |
|---|---|---|
| `MARKETING_URL` | `https://byzantiumai.net` | Where bare-root / unknown-campaign hits go. |

## Deploy

This is its **own** Vercel project, separate from the marketing site
(`project-whipi`) for uptime isolation. From this folder:

```bash
npx vercel        # first run: create a NEW project (e.g. byzantium-link)
npx vercel --prod
```

Then in the Vercel dashboard for that project: **Settings → Domains → add
`link.byzantiumai.net`**, and create the CNAME it gives you in Cloudflare
(**DNS only**, grey cloud).
