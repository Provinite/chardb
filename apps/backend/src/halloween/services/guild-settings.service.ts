import { Injectable } from "@nestjs/common";
import type { HalloweenGuildSettings, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { HalloweenClock } from "../clock";
import {
  MissingGuildSettingsError,
  ValidationError,
  type ValidationFieldError,
} from "../errors";
import { getEventStatus, getLastReset, type EventStatus } from "../time";

type Rule = [field: keyof HalloweenGuildSettings, error: string, ok: () => boolean];

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
    ["guildId", "Guild ID should be a numeric string", () => /^\d+$/.test(guildId)],
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

@Injectable()
export class GuildSettingsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly clock: HalloweenClock,
  ) {}

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

  async has(guildId: string, tx: Prisma.TransactionClient = this.db): Promise<boolean> {
    return (await tx.halloweenGuildSettings.count({ where: { guildId } })) > 0;
  }

  /** What `/settings set` starts from in a guild that has never been set up. */
  async createDefaults(
    guildId: string,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGuildSettings> {
    const settings: HalloweenGuildSettings = {
      guildId,
      endDate: null,
      knocksPerDay: 2,
      resetTime: 6,
      startDate: null,
      winRate: 0.5,
      winChannel: null,
    };
    const validation = validateGuildSettings(settings);
    if (validation !== true) {
      throw new ValidationError({
        message: "Prize validation failed",
        validationErrors: validation,
        thrownFrom: "GuildSettingsService.createDefaults",
      });
    }
    return tx.halloweenGuildSettings.create({ data: settings });
  }

  /** Merges `changes` into the stored settings and validates the result. */
  async update(
    guildId: string,
    changes: Partial<Omit<HalloweenGuildSettings, "guildId">>,
    tx: Prisma.TransactionClient = this.db,
  ): Promise<HalloweenGuildSettings> {
    const updated = { ...(await this.get(guildId, tx)), ...changes };
    const validation = validateGuildSettings(updated);
    if (validation !== true) {
      throw new ValidationError({
        message: "Guild Settings validatiion failed during update",
        validationErrors: validation,
        thrownFrom: "GuildSettingsService.update",
      });
    }
    return tx.halloweenGuildSettings.update({
      where: { guildId },
      data: changes,
    });
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
