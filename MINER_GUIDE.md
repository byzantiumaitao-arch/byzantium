# Byzantium — Miner Guide

> How to mine on Byzantium (subnet **SN76**): get a link, share it on X or Farcaster, and drive real people to click it. The network measures genuine clicks and rewards them in ن.

## Setup — website first, chain last

Three steps, done once. **Do the paid on-chain registration LAST**, so you can get going today:

1. **Create a wallet (free, offline)** — you get a **hotkey address** immediately. This doesn't touch the chain yet.
2. **Sign up** at [byzantiumai.net](https://byzantiumai.net) → **Become a Miner**. Connect a social account, **paste your hotkey address** on your dashboard, grab your link, and start collecting clicks right away.
3. **Register on-chain when you're ready** — the only public, paid step, so it comes last. It's what turns the clicks you've already collected into on-chain rewards.

We do **not** ask you to prove you own the hotkey (no signature challenge): rewards go to whatever key you paste, so there's no reason to enter anyone else's. We only **format-check** the address, so a typo can't quietly send rewards to the wrong place.

## The one thing that matters

**The quality of the traffic you send.** Real, engaged humans get paid; fake or bought traffic scores ≈ 0. Don't buy clicks or run click farms — it just won't count.

## Step by step

1. **Create a wallet** (free, offline) to get your hotkey address:

   ```bash
   btcli wallet new-coldkey --wallet.name <CK>     # back up the mnemonic OFFLINE
   btcli wallet new-hotkey  --wallet.name <CK> --wallet.hotkey <HK>
   ```

2. **Sign up** at byzantiumai.net → **Become a Miner**. Connect a social (X or Farcaster) and **paste your hotkey SS58 address** on your dashboard.

3. **Grab your link:** `link.byzantiumai.net/<you>/<campaign>`. Share a test click and check your **dashboard** — clicks show up right away and count as *qualified* after ~24h (the delay protects against spoofing).

4. **Register on-chain (last, when ready):**

   ```bash
   btcli subnets register --netuid 76 --network finney --wallet.name <CK> --wallet.hotkey <HK>
   ```

   This gives your hotkey a UID so the clicks you've already collected can convert to rewards. Registration cost is dynamic — check it right before you run this.

5. **Run:** share your link and drive clicks from **X or Farcaster** — posts, threads, replies, bio, or an automated agent. We don't mind *how* you get clicks, as long as they come from real people on those platforms.

6. **Scale:** run **multiple agents / connect multiple socials** under your one miner profile. Growth comes from real reach. *(A referral program is coming soon.)*

## Costs

- The **registration fee** on SN76 (dynamic — checked at register time).
- Optional **AI API costs** if you run an agent (e.g. Neynar / an LLM API).
- No stake required.

## Run your own AI agent

You don't have to post by hand. We publish a **ready-to-use starter agent** on our GitHub — clone it, add your keys, point it at your campaign, and it posts and engages on X and Farcaster around the clock. It needs a social API key (e.g. Neynar).

## Gotchas

- **Paste the right hotkey.** We verify format, not ownership — rewards go to the address you enter, so a wrong-but-valid address pays someone else. Double-check it.
- **Qualified counts appear on a ~24h delay** — don't expect instant per-click feedback.

---

Ready to start? Go to [byzantiumai.net](https://byzantiumai.net) → **Become a Miner**.
