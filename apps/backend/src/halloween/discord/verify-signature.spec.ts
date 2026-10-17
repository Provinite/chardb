import { generateKeyPairSync, sign, KeyObject } from "crypto";
import { verifyDiscordSignature } from "./verify-signature";

function rawPublicKeyHex(publicKey: KeyObject): string {
  const jwk = publicKey.export({ format: "jwk" });
  return Buffer.from(jwk.x as string, "base64url").toString("hex");
}

describe("verifyDiscordSignature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyHex = rawPublicKeyHex(publicKey);
  const timestamp = "1697558400";
  const body = JSON.stringify({ type: 1 });
  const signatureFor = (message: string) =>
    sign(null, Buffer.from(message), privateKey).toString("hex");

  it("accepts a body signed over timestamp + body", () => {
    expect(
      verifyDiscordSignature(
        publicKeyHex,
        timestamp,
        Buffer.from(body),
        signatureFor(timestamp + body),
      ),
    ).toBe(true);
  });

  it("rejects a different body under the same signature", () => {
    expect(
      verifyDiscordSignature(
        publicKeyHex,
        timestamp,
        Buffer.from(JSON.stringify({ type: 2 })),
        signatureFor(timestamp + body),
      ),
    ).toBe(false);
  });

  it("rejects a different timestamp under the same signature", () => {
    expect(
      verifyDiscordSignature(
        publicKeyHex,
        "1697558401",
        Buffer.from(body),
        signatureFor(timestamp + body),
      ),
    ).toBe(false);
  });

  it("rejects a missing signature or timestamp", () => {
    const signature = signatureFor(timestamp + body);
    expect(
      verifyDiscordSignature(publicKeyHex, undefined, Buffer.from(body), signature),
    ).toBe(false);
    expect(
      verifyDiscordSignature(publicKeyHex, timestamp, Buffer.from(body), undefined),
    ).toBe(false);
  });

  it("rejects a malformed signature rather than throwing", () => {
    expect(
      verifyDiscordSignature(publicKeyHex, timestamp, Buffer.from(body), "zz"),
    ).toBe(false);
  });

  it("rejects a signature from another key", () => {
    const other = generateKeyPairSync("ed25519");
    expect(
      verifyDiscordSignature(
        publicKeyHex,
        timestamp,
        Buffer.from(body),
        sign(null, Buffer.from(timestamp + body), other.privateKey).toString(
          "hex",
        ),
      ),
    ).toBe(false);
  });
});
