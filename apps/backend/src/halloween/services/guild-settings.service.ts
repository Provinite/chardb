import { Injectable } from "@nestjs/common";
import type { HalloweenGuildSettings, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { HalloweenClock } from "../clock";
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

  lastReset(settings: Pick<HalloweenGuildSettings, "resetTime">): Date {
    return getLastReset(settings.resetTime, this.clock.now());
  }

  eventStatus(
    settings: Pick<HalloweenGuildSettings, "startDate" | "endDate">,
  ): EventStatus {
    return getEventStatus(settings, this.clock.now());
  }
}
