import { ConfigService } from "@nestjs/config";
import { HalloweenConfig } from "./halloween.config";

const complete = {
  HALLOWEEN_DISCORD_APPLICATION_ID: "896600597053202462",
  HALLOWEEN_DISCORD_PUBLIC_KEY: "ab".repeat(32),
  HALLOWEEN_DISCORD_BOT_TOKEN: "bot-token",
  HALLOWEEN_IMAGE_BASE_URL: "https://images.example.com/halloween",
};

const configWith = (values: Record<string, string | undefined>) =>
  new ConfigService(values);

describe("HalloweenConfig", () => {
  it("reads the Halloween bot's own Discord application", () => {
    const config = new HalloweenConfig(configWith(complete));
    expect(config.applicationId).toBe("896600597053202462");
    expect(config.publicKey).toBe("ab".repeat(32));
    expect(config.botToken).toBe("bot-token");
  });

  it("gives the image base URL a trailing slash", () => {
    expect(new HalloweenConfig(configWith(complete)).imageBaseUrl).toBe(
      "https://images.example.com/halloween/",
    );
    expect(
      new HalloweenConfig(
        configWith({
          ...complete,
          HALLOWEEN_IMAGE_BASE_URL: "https://images.example.com/halloween/",
        }),
      ).imageBaseUrl,
    ).toBe("https://images.example.com/halloween/");
  });

  it.each(Object.keys(complete))("refuses to start without %s", (key) => {
    expect(
      () => new HalloweenConfig(configWith({ ...complete, [key]: undefined })),
    ).toThrow(key);
  });
});
