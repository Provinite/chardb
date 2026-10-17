import { ConfigService } from "@nestjs/config";
import {
  DeviantArtStrategy,
  DiscordStrategy,
  PatreonStrategy,
  ToyhouseStrategy,
} from "./oauth-link.strategy";

const configWith = (values: Record<string, string>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

/**
 * Every provider's credentials are required at boot, so an environment that
 * is missing one fails to start instead of failing the first link attempt.
 */
describe.each([
  ["DISCORD", DiscordStrategy],
  ["DEVIANTART", DeviantArtStrategy],
  ["TOYHOUSE", ToyhouseStrategy],
  ["PATREON", PatreonStrategy],
])("%s strategy", (prefix, StrategyClass) => {
  const complete = {
    [`${prefix}_CLIENT_ID`]: "client-id",
    [`${prefix}_CLIENT_SECRET`]: "client-secret",
  };

  it("constructs with a client id and secret", () => {
    expect(() => new StrategyClass(configWith(complete))).not.toThrow();
  });

  it.each(["CLIENT_ID", "CLIENT_SECRET"])(
    "refuses to construct without %s",
    (suffix) => {
      const key = `${prefix}_${suffix}`;
      expect(
        () => new StrategyClass(configWith({ ...complete, [key]: "" })),
      ).toThrow(`${key} is required but not configured`);
    },
  );
});
