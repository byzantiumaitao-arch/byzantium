# Byzantium link service (M1)

The redirect + click-logging service behind **`link.byzantiumai.net`**.

```
link.byzantiumai.net/alice
  → log the click (append-only)
  → 302 → taostats.io   (buy ن)
```

This is the first milestone: a pure redirect that records every click. The
device-fingerprint interstitial and the real Postgres click table slot in later
without changing the public behaviour.

## What's here

| Path | What it does |
|---|---|
| `app/[slug]/route.ts` | The redirect. Logs the click, 302s to the destination. |
| `app/api/clicks/route.ts` | Read feed of recent clicks (`?slug=alice` to filter). |
| `lib/clicks.ts` | **Storage layer — the only file that changes for a real DB.** Currently stubbed (logs + in-memory). |
| `lib/config.ts` | Destination URL, marketing URL, reserved paths. |

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
curl -sI localhost:3000/alice            # → 302 Location: https://taostats.io
curl -s  localhost:3000/api/clicks | jq  # → the click you just made
```

## Configuration (Vercel env vars, all optional)

| Var | Default | Meaning |
|---|---|---|
| `LINK_DESTINATION` | `https://taostats.io` | Where every link redirects. |
| `MARKETING_URL` | `https://byzantiumai.net` | Where bare-root / non-slug hits go. |

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
