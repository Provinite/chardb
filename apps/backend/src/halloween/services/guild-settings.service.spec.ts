import type { HalloweenGuildSettings } from "@chardb/database";
import { GuildSettingsService } from "./guild-settings.service";
import { DatabaseService } from "../../database/database.service";
import { HalloweenClock } from "../clock";
import { MissingGuildSettingsError } from "../errors";

const settings = (guildId: string): HalloweenGuildSettings => ({
  guildId,
  startDate: null,
  endDate: null,
  knocksPerDay: 3,
  resetTime: 6,
  winRate: 0.4,
  winChannel: null,
});

/**
 * Every knock reads its guild's settings, so they are cached briefly: a knock
 * then costs no query for them, and a change made on chardb reaches every
 * instance within ten seconds.
 */
describe("GuildSettingsService.getCached", () => {
  let now: number;
  let findUnique: jest.Mock;
  let service: GuildSettingsService;

  beforeEach(() => {
    now = Date.parse("2025-10-17T15:30:00Z");
    findUnique = jest.fn(
      ({ where: { guildId } }: { where: { guildId: string } }) =>
        Promise.resolve(settings(guildId)),
    );
    service = new GuildSettingsService(
      { halloweenGuildSettings: { findUnique } } as unknown as DatabaseService,
      { now: () => new Date(now) } as HalloweenClock,
    );
  });

  it("reads a guild's settings once in ten seconds", async () => {
    await service.getCached("1");
    now += 9_999;
    await expect(service.getCached("1")).resolves.toEqual(settings("1"));
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("reads them again after ten seconds", async () => {
    await service.getCached("1");
    now += 10_000;
    await service.getCached("1");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("keeps at most a hundred guilds, dropping the least recently used", async () => {
    for (let guild = 0; guild < 100; guild++) {
      await service.getCached(`${guild}`);
    }
    await service.getCached("0"); // used again, so "1" is now the oldest
    await service.getCached("100");
    findUnique.mockClear();

    await service.getCached("0");
    expect(findUnique).not.toHaveBeenCalled();
    await service.getCached("1");
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("reads afresh once a guild's settings are invalidated", async () => {
    await service.getCached("1");
    service.invalidate("1");
    await service.getCached("1");
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  // So an event set up on chardb works on the very next knock.
  it("does not remember that a guild had no settings", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(service.getCached("1")).rejects.toBeInstanceOf(
      MissingGuildSettingsError,
    );
    await expect(service.getCached("1")).resolves.toEqual(settings("1"));
  });
});
