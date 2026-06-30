# Byzantium AI Agent Kit

Your own AI agent that advertises your Byzantium tracking link on **Farcaster** —
writing posts and replies that earn **genuine human clicks**, which is what the
network rewards.

You run this yourself, with your own accounts and keys. Byzantium never touches
your credentials.

> **This kit is optional — one way, not the only way.** Byzantium rewards an
> *outcome* (genuine human clicks), not a method. You're free to drive clicks
> however you like: run a different AI agent, work with influencers, share with
> your own community, or post by hand. The only thing that counts is that the
> clicks are **real humans** — automated, botted, fake, or incentivized clicks are
> detected and discarded, and gaming gets accounts removed. Compete on creativity
> and reach, not on faking traffic.

> **Phase 1: Farcaster only.** Farcaster (via the Neynar API) allows autonomous
> posting *and* replying, so the agent is fully hands-off here. X/Twitter support
> comes later and will be more conservative — X suspends accounts for automated
> replies, so it'll start in post-only / approve-before-send mode.

Built on [ElizaOS](https://github.com/elizaOS/eliza). This kit is the Byzantium
configuration layer on top of it: it turns one small JSON file into a ready agent.

---

## How it works

```
byzantium.config.json   ──┐
  (who you are,           │   build the persona + rules + your tracking link
   what campaign)         ├─► ElizaOS agent ──► Farcaster (posts + replies)
campaign brief            │                          │
  (what to say)         ──┘                          ▼
                                        link.byzantiumai.net/<you>/<campaign>
                                          → genuine clicks → your rewards
```

The agent is told **how Byzantium pays**: only genuine human clicks count, and
spam gets detected and discarded (and gets accounts banned). So it's built to be
worth reading — good content that earns one real click beats a hundred ignored
spam replies.

## Prerequisites

- **Node.js v24+** and **[bun](https://bun.sh)** (ElizaOS requirement).
- A **registered Byzantium handle** — sign up at [byzantiumai.net](https://byzantiumai.net)
  and verify your Farcaster account. Your `minerHandle` here must match it, or
  your clicks won't be attributed to you.
- A **[Neynar](https://dev.neynar.com)** account (free Beginner plan is fine). In
  your app's **Agents** tab, click **Create Agent** to get a Farcaster account
  (FID) + signer with no phone needed — or **Use existing account** to connect
  your own.
- An **LLM key** — **OpenAI or Anthropic** (the agent's brain). One is enough; the
  kit auto-detects which.

> New here? The [running guide](GUIDE.md) explains personality, campaigns, rate
> limits, and going live in more depth.

## Setup — the easy way

```bash
cd ai-agent-kit
bash quickstart.sh
```

That one command checks your Node version, installs bun + dependencies, then runs
a **guided setup** that asks for your keys and writes everything for you. It
finishes by verifying your setup actually works. Then:

```bash
npm run build:character   # preview what your agent will say (posts nothing)
npm start                 # run it — still in dry-run until you turn that off
```

When you're happy, set `"dryRun": false` in `byzantium.config.json` and `npm start` again.

## Setup — step by step (if you prefer)

```bash
cd ai-agent-kit
npm i -g bun && bun install   # ElizaOS needs bun; plain `npm install` won't finish
npm run setup                 # guided: asks for handle, campaign, and your keys
npm run check                 # doctor: confirms your keys work & config is valid
```

`npm run check` is your friend — it tells you in plain English exactly what's
wrong (missing key, bad Neynar signer, FID mismatch, unknown campaign) so you
never have to read a stack trace. Run it any time.

Prefer to edit files by hand? `cp .env.example .env`, fill it in, and edit
`byzantium.config.json` (set `minerHandle` to your registered handle and pick a
`campaign`). Then `npm run check`.

**Safety:** the kit ships with `"dryRun": true` — the agent generates posts and
replies and logs them but **does not publish** until you flip that to `false`.
Watch it dry-run first.

## The two files you edit

### `byzantium.config.json` — who you are

| Field | Meaning |
|---|---|
| `minerHandle` | Your registered Byzantium handle. **Must match** byzantiumai.net. |
| `campaign` | Which campaign to promote (a key in `src/campaigns.ts`). |
| `linkBase` | Base of the tracking link. Default `https://link.byzantiumai.net`. |
| `farcaster.channels` | Channels the agent posts/looks in (e.g. `/bittensor`). |
| `farcaster.replyProbability` | 0–1, how often it replies to a relevant cast it sees. |
| `posting.maxPostsPerDay` | Cap on original posts per day (the kit spaces them out). `0` = never post. |
| `posting.maxCommentsPerDay` | Cap on replies per day. `0` = never comment. |
| `posting.postImmediately` | Post one cast on startup. |
| `posting.dryRun` | **true = generate but never publish.** Start here. |
| `persona.traits` | Adjectives that shape the voice (e.g. `witty`, `technical`, `contrarian`). |
| `persona.voice` | Your own extra style rules, added on top of the built-in ones. |

> **Rate control.** You set posts/comments **per day** — the kit converts those into
> the agent's internal timers for you. Both are *upper bounds*: actual comments
> also depend on `replyProbability` and how many relevant casts exist. These stay
> well under Farcaster's limits (no restriction below 1,000 casts/day) and Neynar's
> free-plan API limits. Set either to `0` to turn that behaviour off entirely.

### `src/campaigns.ts` — what to say

Each campaign has a `brief`, `topics`, `tone`, and a set of `angles` the agent
rotates through. In Phase 1 these ship with the kit; later they're pulled from
the Byzantium API so brands can update the message centrally.

## Running multiple agents

One miner can run several agents — each its own Farcaster account + personality —
all under the same `minerHandle`, so every click still pays you. The default
agent is `byzantium.config.json`; extra agents live in `agents/<id>.json`:

```bash
npm run agents          # list all agents + whether their creds are set
npm start taostats      # run a specific agent (its own process)
```

Use a separate agent when the **personality/audience** differs — not just to add
a campaign. See [`agents/README.md`](agents/README.md) and [GUIDE §6.5](GUIDE.md).

## Be a good citizen (it's also how you earn more)

- The agent is tuned to add value first and share the link only when it fits.
  Don't crank `replyProbability` to 1 or `maxPostsPerDay`/`maxCommentsPerDay` sky
  high — spammy behaviour gets your Farcaster account flagged **and** produces
  low-quality clicks that Byzantium discards. You earn nothing for those.
- Keep `dryRun: true` until you're happy with what it writes.

## Roadmap

- **Now:** Farcaster, fully autonomous, briefs shipped in-kit.
- **Next:** briefs fetched from the Byzantium API per campaign.
- **Later:** X/Twitter (post-only / approve-before-send first), and a feedback
  loop that weights angles by which ones produce *qualified* clicks.
