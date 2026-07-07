#!/usr/bin/env python3
"""Byzantium weight_copy validator (SN76).

A Byzantium validator does NOT score miners itself — the reference validator does
that from the click ledger and publishes the result. This process just:

  1. fetches the published per-miner weights from the public feed,
  2. maps each miner's hotkey to its on-chain UID,
  3. sets those weights on-chain for netuid 76, once per epoch.

No axon, no miner queries, no GPU. See README.md.
"""

import argparse
import json
import time
import urllib.request

import bittensor as bt

DEFAULT_FEED = "https://link.byzantiumai.net/api/validator/weights"


def parse_args():
    p = argparse.ArgumentParser(description="Byzantium weight_copy validator (SN76)")
    p.add_argument("--netuid", type=int, default=76)
    p.add_argument("--network", default="finney", help="finney (mainnet) or test")
    p.add_argument("--wallet.name", dest="wallet_name", default="validator")
    p.add_argument("--wallet.hotkey", dest="wallet_hotkey", default="default")
    p.add_argument("--feed_url", default=DEFAULT_FEED,
                   help="published weights endpoint")
    p.add_argument("--burn_hotkey", default="",
                   help="override the burn hotkey; normally taken from the feed's "
                        "(burn) row")
    p.add_argument("--epoch_seconds", type=int, default=1200,
                   help="seconds between weight sets; keep >= the subnet's weight "
                        "rate limit so commits aren't rejected")
    return p.parse_args()


def fetch_weights(url):
    """GET the public feed → list of {miner, weight, hotkey, ...} rows."""
    req = urllib.request.Request(url, headers={"User-Agent": "byzantium-weight-copy/1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("weights", [])


def main():
    args = parse_args()
    wallet = bt.wallet(name=args.wallet_name, hotkey=args.wallet_hotkey)
    subtensor = bt.subtensor(network=args.network)
    my_hotkey = wallet.hotkey.ss58_address
    bt.logging.info(
        f"weight_copy validator | netuid={args.netuid} network={args.network} "
        f"hotkey={my_hotkey} feed={args.feed_url}"
    )

    while True:
        try:
            metagraph = subtensor.metagraph(args.netuid)

            # Pre-flight: are we registered, and do we hold a validator permit?
            if my_hotkey not in metagraph.hotkeys:
                bt.logging.warning("Our hotkey is not registered on SN76 — "
                                   "register + stake first (see README).")
            else:
                uid = metagraph.hotkeys.index(my_hotkey)
                if not bool(metagraph.validator_permit[uid]):
                    bt.logging.warning("No validator permit yet (need enough stake "
                                       "for top-64). Weights won't count until then.")

            # Resolve published weights → on-chain UIDs. Weight for miners not yet
            # registered on-chain is NOT redistributed — it becomes "leftover" and
            # is routed to the burn hotkey, so everyone keeps exactly their share.
            rows = fetch_weights(args.feed_url)
            burn_hotkey = args.burn_hotkey or next(
                (r.get("hotkey") for r in rows if r.get("burn") and r.get("hotkey")), None
            )

            uid_weight: dict[int, float] = {}
            resolved = 0.0
            for row in rows:
                hk = row.get("hotkey")
                w = float(row.get("weight") or 0)
                if not hk or w <= 0:
                    continue
                if hk in metagraph.hotkeys:
                    uid = metagraph.hotkeys.index(hk)
                    uid_weight[uid] = uid_weight.get(uid, 0.0) + w
                    resolved += w
                # else: hotkey not registered on-chain yet → falls into leftover

            leftover = max(0.0, 1.0 - resolved)   # unregistered miners' share → burn
            if leftover > 1e-9:
                if burn_hotkey and burn_hotkey in metagraph.hotkeys:
                    buid = metagraph.hotkeys.index(burn_hotkey)
                    uid_weight[buid] = uid_weight.get(buid, 0.0) + leftover
                else:
                    bt.logging.warning(
                        f"burn hotkey not registered on-chain — {leftover:.4f} of "
                        f"weight can't be burned this round (chain will renormalise it)."
                    )

            if not uid_weight:
                bt.logging.warning("No resolvable weights this round.")
            else:
                uids = list(uid_weight.keys())
                weights = [uid_weight[u] for u in uids]
                ok, msg = subtensor.set_weights(
                    wallet=wallet,
                    netuid=args.netuid,
                    uids=uids,
                    weights=weights,
                    wait_for_inclusion=False,
                    wait_for_finalization=False,
                )
                # Commit-reveal, if enabled on the subnet, is applied by the SDK here.
                bt.logging.info(f"set_weights ok={ok} n={len(uids)} burn={leftover:.4f} msg={msg}")

        except Exception as e:  # never let one bad epoch kill the loop
            bt.logging.error(f"epoch error: {e}")

        time.sleep(args.epoch_seconds)


if __name__ == "__main__":
    main()
