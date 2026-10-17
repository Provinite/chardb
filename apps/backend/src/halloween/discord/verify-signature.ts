import { createPublicKey, verify } from "crypto";

/**
 * DER header for an Ed25519 SubjectPublicKeyInfo. Discord hands out the raw
 * 32-byte key as hex; prefixing this turns it into something
 * `crypto.createPublicKey` accepts, without a dependency on tweetnacl.
 */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Whether an interaction really came from Discord: an Ed25519 signature over
 * the timestamp header followed by the exact request bytes.
 *
 * @see https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers
 */
export function verifyDiscordSignature(
  publicKeyHex: string,
  timestamp: string | undefined,
  rawBody: Buffer,
  signatureHex: string | undefined,
): boolean {
  if (!timestamp || !signatureHex) {
    return false;
  }
  try {
    const key = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.concat([Buffer.from(timestamp), rawBody]),
      key,
      Buffer.from(signatureHex, "hex"),
    );
  } catch {
    return false;
  }
}
