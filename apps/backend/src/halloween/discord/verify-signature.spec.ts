import { generateKeyPairSync, sign } from "crypto";
import { verifyDiscordSignature } from "./verify-signature";

describe("verifyDiscordSignature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const now = new Date("2026-10-18T12:00:00Z");
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const body = JSON.stringify({ type: 1 });
  const signatureFor = (message: string, key = privateKey) =>
    sign(null, Buffer.from(message), key).toString("hex");

  const verify = (
    overrides: Partial<{
      timestamp: string | undefined;
      body: string;
      signature: string | undefined;
      now: Date;
    }> = {},
  ) =>
    verifyDiscordSignature(
      publicKey,
      "timestamp" in overrides ? overrides.timestamp : timestamp,
      Buffer.from(overrides.body ?? body),
      "signature" in overrides
        ? overrides.signature
        : signatureFor(timestamp + body),
      overrides.now ?? now,
    );

  it("accepts a fresh body signed over timestamp + body", () => {
    expect(verify()).toEqual({ ok: true });
  });

  it("rejects a different body under the same signature", () => {
    expect(verify({ body: JSON.stringify({ type: 2 }) })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a different timestamp under the same signature", () => {
    expect(verify({ timestamp: String(Number(timestamp) + 1) })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a missing signature or timestamp", () => {
    expect(verify({ timestamp: undefined })).toEqual({
      ok: false,
      reason: "missing_headers",
    });
    expect(verify({ signature: undefined })).toEqual({
      ok: false,
      reason: "missing_headers",
    });
  });

  it("rejects a malformed signature rather than throwing", () => {
    expect(verify({ signature: "zz" })).toEqual({
      ok: false,
      reason: "bad_signature",
    });
  });

  it("rejects a signature from another key", () => {
    const other = generateKeyPairSync("ed25519");
    expect(
      verify({ signature: signatureFor(timestamp + body, other.privateKey) }),
    ).toEqual({ ok: false, reason: "bad_signature" });
  });

  describe("freshness", () => {
    const minutes = (n: number) => new Date(now.getTime() + n * 60_000);

    it("accepts a timestamp up to five minutes old or ahead", () => {
      expect(verify({ now: minutes(5) })).toEqual({ ok: true });
      expect(verify({ now: minutes(-5) })).toEqual({ ok: true });
    });

    // A captured, validly signed request must not be replayable later.
    it("rejects a correctly signed request more than five minutes old", () => {
      expect(verify({ now: minutes(5.1) })).toEqual({
        ok: false,
        reason: "stale_timestamp",
      });
    });

    it("rejects one more than five minutes in the future", () => {
      expect(verify({ now: minutes(-5.1) })).toEqual({
        ok: false,
        reason: "stale_timestamp",
      });
    });

    it("rejects a timestamp that is not a number", () => {
      const iso = now.toISOString();
      expect(
        verify({ timestamp: iso, signature: signatureFor(iso + body) }),
      ).toEqual({ ok: false, reason: "stale_timestamp" });
    });
  });
});
