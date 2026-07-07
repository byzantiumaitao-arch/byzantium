# Byzantium Validator Kit — SN76

Run a Byzantium validator. Unlike compute subnets, a Byzantium validator does **not**
generate tasks, query miners, or score anything itself — the reference validator scores
click authenticity from the ledger and **publishes the resulting weights**. Your
validator just copies those weights on-chain each epoch (a `weight_copy` validator).

**Why copy and not score?** Independent miner scoring — validators judging clicks
themselves — is introduced **gradually in v2**. We're deliberately keeping scoring
centralized while we collect more data and add safeguards against fake-click exploits;
opening it up before that would just hand attackers the scoring rules. v1 is copy-only
by design.

No axon, no open ports, no GPU. A tiny CPU box (1 core / 2 GB) is enough.

> Want to audit the numbers yourself? That opens in **v2** — see below.

---

## Network

| | Mainnet | Testnet |
|---|---|---|
| netuid | **76** | _TBD_ |
| network flag | `--subtensor.network finney` | `--subtensor.network test` |

---

## Setup and run

```bash
git clone <this-kit> && cd validator-kit
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# wallet + registration (mainnet: netuid 76 on finney)
btcli wallet create --wallet.name validator --wallet.hotkey default
btcli subnets register --netuid 76 --network finney \
  --wallet.name validator --wallet.hotkey default

# stake (needed for a validator permit — see below)
btcli stake add --netuid 76 --network finney --wallet.name validator

# run (raw)
python weight_copy_validator.py \
  --netuid 76 --network finney \
  --wallet.name validator --wallet.hotkey default

# or with pm2
pm2 start weight_copy_validator.py --name byz-validator --interpreter python3 -- \
  --netuid 76 --network finney --wallet.name validator --wallet.hotkey default
```

Confirm your permit is live: `btcli subnet metagraph --netuid 76 --network finney`
should show **VPERMIT = True** for your hotkey.

---

## Stake & permit

Only the **top validators by stake** (permit holders) have their weights counted. Check
the current **dividend split** before committing real stake — if incumbents dominate, a
small-stake validator earns ≈ 0. Keep the staking coldkey off a shared/VPS box, or use a
separate low-value key.

## The burn address

Miners who earn weight but haven't set a payout hotkey (or haven't registered it
on-chain) don't have their share handed to other miners — it's routed to a **burn
address**. The feed folds that weight into a single `"(burn)"` row, and this kit
sends it (plus any not-yet-registered miner's share) to the burn address's UID.

The burn address is a Byzantium-controlled hotkey, registered on SN76, that is
**never spent from** — so its emissions accumulate untouched. The kit reads it from
the feed's `(burn)` row automatically; `--burn_hotkey` overrides it.

## Cadence & commit-reveal

`--epoch_seconds` controls how often weights are set (default 1200s / 20 min). Keep it at
or above the subnet's weight rate limit so commits aren't rejected. If the subnet has
commit-reveal enabled, the Bittensor SDK applies it automatically — you don't do anything.

## Auditing (v2 — not live yet)

In **v1 the only public endpoint is `/weights`**, so validators copy the published
weights. The independent audit below opens in **v2**, when the per-click feed
`/api/validator/clicks` goes live (it 404s today):

```bash
curl "https://link.byzantiumai.net/api/validator/clicks?since=0&limit=1000"  # v2: settled clicks + per-click scores
curl  https://link.byzantiumai.net/api/validator/weights                     # the weights you copy
```

In v2 you'll page through all of `/clicks`, sum each miner's `authenticity_score`,
normalise to 1.0, and confirm it matches `/weights` — reproducing everything **except**
the private per-click score and the `hotkey`/`burn` fields. If the numbers don't
reconcile, don't copy.

The full API reference (response shapes, the 30-day window, the `burn` rule, and a
ready paging/audit snippet) will be published with the v2 audit feed.
