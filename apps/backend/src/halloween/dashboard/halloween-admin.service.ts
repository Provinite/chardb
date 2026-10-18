import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { HalloweenGuildSettings } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { validateGuildSettings } from "../services/guild-settings.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { HalloweenDashboardService } from "./halloween-dashboard.service";
import type { HalloweenSettingsInput } from "./halloween-admin.inputs";
import type { HalloweenEventSettings } from "./halloween-dashboard.types";

const SETTING_FIELDS = [
  "startDate",
  "endDate",
  "knocksPerDay",
  "resetTime",
  "winRate",
  "winChannel",
] as const;

const toView = (settings: HalloweenGuildSettings): HalloweenEventSettings => ({
  startDate: settings.startDate,
  endDate: settings.endDate,
  knocksPerDay: settings.knocksPerDay,
  resetTime: settings.resetTime,
  winRate: settings.winRate,
  winChannel: settings.winChannel,
});

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : a === b;

/**
 * Running the event from chardb: what `/settings set` and `/prize admin`
 * used to do in Discord. Every change is logged with who made it, since the
 * rows keep only the latest values.
 */
@Injectable()
export class HalloweenAdminService {
  private readonly logger = new Logger(HalloweenAdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
  ) {}

  /** Creates the guild's settings the first time, replaces them after. */
  async updateSettings(
    communityId: string,
    input: HalloweenSettingsInput,
    actorUserId: string,
  ): Promise<HalloweenEventSettings> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const next: HalloweenGuildSettings = {
      guildId,
      startDate: input.startDate,
      endDate: input.endDate,
      knocksPerDay: input.knocksPerDay,
      resetTime: input.resetTime,
      winRate: input.winRate,
      winChannel: input.winChannel,
    };
    const validation = validateGuildSettings(next);
    if (validation !== true) {
      throw new BadRequestException(
        validation.map(({ error }) => error).join(". "),
      );
    }

    const before = await this.db.halloweenGuildSettings.findUnique({
      where: { guildId },
    });
    const saved = await this.db.halloweenGuildSettings.upsert({
      where: { guildId },
      create: next,
      update: next,
    });

    const who = { communityId, guildId, actorUserId };
    if (!before) {
      this.logger.log({
        event: HalloweenLogEvent.SettingsCreated,
        message: `Set up the event in guild ${guildId} from chardb`,
        ...who,
      } satisfies HalloweenLogLine);
    }
    for (const field of SETTING_FIELDS) {
      if (before && sameValue(before[field], saved[field])) continue;
      this.logger.log({
        event: HalloweenLogEvent.SettingChanged,
        message: `Changed ${field} in guild ${guildId} from chardb`,
        ...who,
        setting: field,
        oldValue: before ? before[field] : null,
        newValue: saved[field],
      } satisfies HalloweenLogLine);
    }
    return toView(saved);
  }
}
