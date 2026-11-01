import { Injectable } from "@nestjs/common";
import type { Community } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { Clock } from "../clock/clock";
import {
  findAchievement,
  type AchievementDefinition,
} from "./achievement-catalog";
import { signInAchievements } from "./sign-in-achievements";

export interface EarnedAchievementView extends AchievementDefinition {
  id: string;
  earnedAt: Date;
  community: Community;
}

@Injectable()
export class AchievementsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly clock: Clock,
  ) {}

  /**
   * Grants what signing in now earns: trick-or-treater for each community
   * the user belongs to whose Halloween event is on. One already earned is
   * left as it was.
   */
  async recordSignIn(userId: string): Promise<void> {
    const communities = await this.db.community.findMany({
      where: {
        halloweenEnabled: true,
        discordGuildId: { not: null },
        roles: { some: { communityMembers: { some: { userId } } } },
      },
      select: { id: true, discordGuildId: true },
    });
    if (!communities.length) return;

    const settings = await this.db.halloweenGuildSettings.findMany({
      where: {
        guildId: {
          in: communities.flatMap((c) =>
            c.discordGuildId ? [c.discordGuildId] : [],
          ),
        },
      },
      select: { guildId: true, startDate: true, endDate: true },
    });
    const byGuild = new Map(settings.map((s) => [s.guildId, s]));
    const events = communities.flatMap((c) => {
      const event = c.discordGuildId ? byGuild.get(c.discordGuildId) : null;
      return event
        ? [
            {
              communityId: c.id,
              startDate: event.startDate,
              endDate: event.endDate,
            },
          ]
        : [];
    });

    const now = this.clock.now();
    const earned = signInAchievements(events, now);
    if (!earned.length) return;
    await this.db.userAchievement.createMany({
      data: earned.map((e) => ({ ...e, userId, earnedAt: now })),
      skipDuplicates: true,
    });
  }

  /** Newest first. A slug no longer in the catalog is left out. */
  async forUser(userId: string): Promise<EarnedAchievementView[]> {
    const rows = await this.db.userAchievement.findMany({
      where: { userId },
      include: { community: true },
      orderBy: { earnedAt: "desc" },
    });
    return rows.flatMap((row) => {
      const definition = findAchievement(row.slug);
      return definition
        ? [
            {
              ...definition,
              id: row.id,
              earnedAt: row.earnedAt,
              community: row.community,
            },
          ]
        : [];
    });
  }
}
