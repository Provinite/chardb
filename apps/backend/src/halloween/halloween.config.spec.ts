import { KeyObject } from "crypto";
import { ConfigService } from "@nestjs/config";
import { HalloweenConfig } from "./halloween.config";

const complete = {
  HALLOWEEN_DISCORD_APPLICATION_ID: "896600597053202462",
  HALLOWEEN_DISCORD_PUBLIC_KEY: "ab".repeat(32),
  HALLOWEEN_DISCORD_BOT_TOKEN: "bot-token",
  FRONTEND_URL: "https://chardb.example.com",
};

const configWith = (values: Record<string, string | undefined>) =>
  new ConfigService(values);

describe("HalloweenConfig", () => {
  it("reads the Halloween bot's own Discord application", () => {
    const config = new HalloweenConfig(configWith(complete));
    expect(config.applicationId).toBe("896600597053202462");
    expect(config.botToken).toBe("bot-token");
  });

  it("turns the public key into a key object once, at boot", () => {
    const config = new HalloweenConfig(configWith(complete));
    expect(config.publicKey).toBeInstanceOf(KeyObject);
    expect(config.publicKey.asymmetricKeyType).toBe("ed25519");
  });

  // Buffer.from(hex) silently drops characters that are not hex, so a typo
  // would otherwise boot fine and refuse every request from Discord.
  it.each([
    ["too short", "ab".repeat(31)],
    ["too long", "ab".repeat(33)],
    ["not hex", `${"ab".repeat(31)}zz`],
    ["base64 by mistake", Buffer.alloc(32, 1).toString("base64")],
  ])("refuses to start with a public key that is %s", (_why, key) => {
    expect(
      () =>
        new HalloweenConfig(
          configWith({ ...complete, HALLOWEEN_DISCORD_PUBLIC_KEY: key }),
        ),
    ).toThrow(
      "HALLOWEEN_DISCORD_PUBLIC_KEY must be the 64-character hex Ed25519 public key",
    );
  });

  // The images ship with the frontend, in public/halloween.
  it("finds the images where the frontend serves them", () => {
    expect(new HalloweenConfig(configWith(complete)).imageBaseUrl).toBe(
      "https://chardb.example.com/halloween/",
    );
    expect(
      new HalloweenConfig(
        configWith({ ...complete, FRONTEND_URL: "http://localhost:3000/" }),
      ).imageBaseUrl,
    ).toBe("http://localhost:3000/halloween/");
  });

  it.each(Object.keys(complete))("refuses to start without %s", (key) => {
    expect(
      () => new HalloweenConfig(configWith({ ...complete, [key]: undefined })),
    ).toThrow(key);
  });
});
