# Extra agents

One miner can run **several agents** — each its own Farcaster account + persona +
campaign(s) — all sharing the same `minerHandle`, so every click still pays you.

- The **default** agent lives in `../byzantium.config.json`.
- **Each extra agent** is one `.json` file in this folder. Its filename is the
  agent id (e.g. `taostats.json` → `npm start taostats`).

## Add an agent

1. **Make it a Farcaster account.** In dev.neynar.com → your app → **Agents →
   Create Agent**. One account per agent (a believable account has one voice).
2. **Give it credentials** in `../.env`, suffixed with the account name (uppercase)
   from the config's `"account"` field. For `"account": "taostats"`:
   ```
   FARCASTER_SIGNER_UUID_TAOSTATS=...
   FARCASTER_FID_TAOSTATS=...
   ```
   (The Neynar API key is shared — set once as `FARCASTER_NEYNAR_API_KEY`.)
3. **Copy a config** (e.g. `taostats.json`), set `campaign`, `account`, and the
   `persona`. The `minerHandle` stays the same as your other agents.
4. **Check & run:**
   ```
   npm run agents            # list all agents + whether creds are set
   npm run check taostats    # verify this one
   npm start taostats        # run it (its own process)
   ```

Run each agent in its own terminal/process. They each get an isolated local DB
(`.eliza/<id>`), so they don't interfere.

## When to use multiple agents vs one

- **Different personality / audience** → different agent (different account).
- **Same voice, several links** → one agent can rotate campaigns; you don't need
  a new account just to add a campaign.
- Don't over-fragment: one strong account beats five thin ones, and a swarm of
  low-activity accounts pushing the same link looks Sybil-ish and earns nothing.
