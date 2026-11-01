import { Injectable } from "@nestjs/common";
import type { HalloweenGuildSettings, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { Clock } from "../../clock/clock";
import {
  MissingGuildSettingsError,
  type ValidationFieldError,
} from "../errors";
import { getEventStatus, getLastReset, type EventStatus } from "../time";

type Rule = [
  field: keyof HalloweenGuildSettings,
  error: string,
  ok: () => boolean,
];

export function validateGuildSettings(
  settings: HalloweenGuildSettings,
): true | ValidationFieldError[] {
  const { startDate, endDate, guildId, knocksPerDay, resetTime, winRate } =
    settings;
  const rules: Rule[] = [
    [
      "startDate",
      "Start date must be before end date if they are both set",
      () => !startDate || !endDate || startDate < endDate,
    ],
    [
      "guildId",
      "Guild ID should be a numeric string",
      () => /^\d+$/.test(guildId),
    ],
    [
      "knocksPerDay",
      "Knocks per day should be a positive whole number",
      () => knocksPerDay > 0 && Number.isSafeInteger(knocksPerDay),
    ],
    [
      "resetTime",
      "Reset time must be a whole number between 0 and 23",
      () => resetTime >= 0 && resetTime < 24,
    ],
    [
      "winRate",
      "Win rate must be a decimal between 0 and 1",
      () => winRate >= 0 && winRate <= 1,
    ],
  ];
  const failing = rules.filter(([, , ok]) => !ok());
  return failing.length
    ? failing.map(([field, error]) => ({ field, error }))
    : true;
}

/** How long a knock may use settings it read earlier. */
export const SETTINGS_CACHE_MS = 10_000;
const SETTINGS_CACHE_GUILDS = 100;

@Injectable()
export class GuildSettingsService {
  /** Least recently used first: a Map keeps insertion order. */
  private readonly cache = new Map<
    string,
    { settings: HalloweenGuildSettings; readAt: number }
  >();

  constructor(
    private readonly db: DatabaseService,
    private readonly clock: Clock,
  ) {}

  /**
   * The guild's settings, as read up to ten seconds ago. For `/knock`, which
   * reads them on every knock; a change made on chardb clears this
   * instance's copy, and reaches the others within that time.
   */
  async getCached(guildId: string): Promise<HalloweenGuildSettings> {
    const now = this.clock.now().getTime();
    const cached = this.cache.get(guildId);
    this.cache.delete(guildId);
    if (cached && now - cached.readAt < SETTINGS_CACHE_MS) {
      this.cache.set(guildId, cached);
      return cached.settings;
    }
    const settings = await this.get(guildId);
    this.cache.set(guildId, { settings, readAt: now });
    if (this.cache.size > SETTINGS_CACHE_GUILDS) {
      const [oldest] = this.cache.keys();
      this.cache.delete(oldest);
    }
    return settings;
  }

  invalidate(guildId: string): void {
    this.cache.delete(guildId);
  }

  async get(
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGuildSettings> {
    const settings = await tx.halloweenGuildSettings.findUnique({
      where: { guildId },
    });
    if (!settings) {
      throw new MissingGuildSettingsError({
        thrownFrom: "GuildSettingsService.get",
        guildId,
      });
    }
    return settings;
  }

  lastReset(settings: Pick<HalloweenGuildSettings, "resetTime">): Date {
    return getLastReset(settings.resetTime, this.clock.now());
  }

  eventStatus(
    settings: Pick<HalloweenGuildSettings, "startDate" | "endDate">,
  ): EventStatus {
    return getEventStatus(settings, this.clock.now());
  }
}
