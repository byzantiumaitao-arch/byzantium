// Off-chain Bittensor wallet-address (SS58) validation.
//
// A Bittensor hotkey is an SS58 address: base58( prefix || 32-byte public key ||
// 2-byte checksum ), where checksum = blake2b-512("SS58PRE" || prefix || pubkey)
// truncated to 2 bytes. We validate the FORMAT and CHECKSUM only — no chain call.
// This catches typos and garbage (a mistyped address fails the checksum), but it
// does NOT prove the key exists on-chain or that the signer owns it (by design —
// see the miner-identity decision: rewards flow to whatever key is entered, so
// there's no incentive to enter someone else's).
//
// Zero dependencies: base58 decode by hand, blake2b-512 from Node's crypto.

import { createHash } from "crypto";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// Bittensor mainnet uses SS58 network prefix 42 (addresses begin with "5").
const BITTENSOR_SS58_PREFIX = 42;

function base58Decode(s: string): Uint8Array | null {
  const bytes: number[] = [];
  for (const ch of s) {
    let carry = B58.indexOf(ch);
    if (carry < 0) return null; // non-base58 character
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // leading '1' chars encode leading zero bytes
  for (let k = 0; k < s.length && s[k] === "1"; k++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

function ss58Checksum(body: Uint8Array): Uint8Array {
  const pre = Buffer.from("SS58PRE", "ascii");
  const digest = createHash("blake2b512")
    .update(Buffer.concat([pre, Buffer.from(body)]))
    .digest();
  return digest.subarray(0, 2);
}

/**
 * True iff `address` is a well-formed Bittensor SS58 address (correct base58,
 * length, network prefix, and checksum). Format-only — no network / chain call.
 */
export function isValidBittensorAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  const a = address.trim();
  // A prefix-42 account address base58-encodes to ~47–48 chars; bound loosely.
  if (a.length < 46 || a.length > 50) return false;

  const decoded = base58Decode(a);
  // single-byte prefix + 32-byte pubkey + 2-byte checksum = 35 bytes
  if (!decoded || decoded.length !== 35) return false;
  if (decoded[0] !== BITTENSOR_SS58_PREFIX) return false;

  const body = decoded.subarray(0, 33); // prefix + pubkey (what the checksum covers)
  const expected = ss58Checksum(body);
  return decoded[33] === expected[0] && decoded[34] === expected[1];
}
