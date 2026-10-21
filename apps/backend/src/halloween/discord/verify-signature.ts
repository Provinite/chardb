import { createPublicKey, verify, type KeyObject } from "crypto";

/**
 * DER header for an Ed25519 SubjectPublicKeyInfo. Discord hands out the raw
 * 32-byte key as hex; prefixing this turns it into something
 * `crypto.createPublicKey` accepts, without a dependency on tweetnacl.
 */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * How far a request's timestamp may be from now. Discord sends interactions
 * at once, so anything older is a replay of a captured request.
 */
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

/**
 * Turns Discord's hex public key into a key object, or throws if it is not 64
 * hex characters. Checked strictly because `Buffer.from(hex)` silently drops
 * characters that are not hex, and Node accepts any 32 bytes as a key, so a
 * typo would otherwise only show up as every request failing.
 */
export function parseDiscordPublicKey(publicKeyHex: string): KeyObject {
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex)) {
    throw new Error("not 64 hex characters");
  }
  return createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
    format: "der",
    type: "spki",
  });
}

export type SignatureCheck =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_headers" | "stale_timestamp" | "bad_signature";
    };

/**
 * Whether an interaction really came from Discord, just now: an Ed25519
 * signature over the timestamp header followed by the exact request bytes,
 * with a timestamp within five minutes of `now`.
 *
 * @see https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers
 */
export function verifyDiscordSignature(
  publicKey: KeyObject,
  timestamp: string | undefined,
  rawBody: Buffer,
  signatureHex: string | undefined,
  now: Date,
): SignatureCheck {
  if (!timestamp || !signatureHex) {
    return { ok: false, reason: "missing_headers" };
  }
  const sentAt = Number(timestamp);
  if (
    !Number.isFinite(sentAt) ||
    Math.abs(now.getTime() / 1000 - sentAt) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return { ok: false, reason: "stale_timestamp" };
  }
  try {
    const valid = verify(
      null,
      Buffer.concat([Buffer.from(timestamp), rawBody]),
      publicKey,
      Buffer.from(signatureHex, "hex"),
    );
    return valid ? { ok: true } : { ok: false, reason: "bad_signature" };
  } catch {
    return { ok: false, reason: "bad_signature" };
  }
}
