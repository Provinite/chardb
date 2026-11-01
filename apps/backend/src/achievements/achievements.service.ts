import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Clock } from "../clock/clock";
import {
  findAchievement,
  type AchievementDefinition,
} from "./achievement-catalog";
import {
  signInAchievements,
  type CommunityHalloweenEvent,
} from "./sign-in-achievements";

export interface EarnedAchievementView extends AchievementDefinition {
  id: string;
  earnedAt: Date;
}

/**
 * How long a user's sign-in check stands before they are checked again.
 * Every page load renews the session, so without this every page load would
 * look the user's events up.
 */
export const SIGN_IN_CHECK_TTL_MS = 60 * 60 * 1000;

/**
 * The most users remembered as checked; the least recent go first. One
 * pushed out costs a query on their next page load, nothing more.
 */
const SIGN_IN_CHECK_CACHE_USERS = 1_000;

/** The `event` field of achievement log lines, for searching. */
export const AchievementLogEvent = {
  /** A user earned an achievement; `reason` says how. */
  Granted: "achievements.granted",
} as const;

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  /**
   * When each user was last checked, least recent first: a Map keeps
   * insertion order. Per instance, so another instance may check a user
   * again, which costs a query and grants nothing twice.
   */
  private readonly checkedAt = new Map<string, number>();

  constructor(
    private readonly db: DatabaseService,
    private readonly clock: Clock,
  ) {}

  /**
   * Grants what signing in now earns: trick-or-treater for each community
   * the user belongs to whose Halloween event is on. One already earned is
   * left as it was. A user whose check found something to award is not
   * checked again for an hour.
   */
  async recordSignIn(userId: string): Promise<void> {
    const now = this.clock.now();
    const last = this.checkedAt.get(userId);
    if (last !== undefined && now.getTime() - last < SIGN_IN_CHECK_TTL_MS) {
      return;
    }

    const events = await this.db.$queryRaw<CommunityHalloweenEvent[]>`
      SELECT c.id AS "communityId",
             s.start_date AS "startDate",
             s.end_date AS "endDate"
      FROM "communities" c
      JOIN "halloween_guild_settings" s ON s.guild_id = c.discord_guild_id
      WHERE c.halloween_enabled
        AND EXISTS (
          SELECT 1
          FROM "community_members" m
          JOIN "roles" r ON r.id = m.role_id
          WHERE r.community_id = c.id AND m.user_id = ${userId}
        )
    `;
    const earned = signInAchievements(events, now);
    // Nothing to award is not remembered: the event may start, or the user
    // join a community, before an hour is up, and the next page load should
    // catch it.
    if (!earned.length) return;

    // Returns only the rows it inserted, so one already earned is not logged
    // as granted again.
    const granted = await this.db.userAchievement.createManyAndReturn({
      data: earned.map((e) => ({ ...e, userId, earnedAt: now })),
      skipDuplicates: true,
      select: { userId: true, communityId: true, slug: true },
    });
    for (const row of granted) {
      this.logger.log({
        event: AchievementLogEvent.Granted,
        message: "Achievement granted",
        ...row,
        reason: "sign-in",
      });
    }
    this.remember(userId, now.getTime());
  }

  private remember(userId: string, at: number): void {
    this.checkedAt.delete(userId);
    this.checkedAt.set(userId, at);
    if (this.checkedAt.size > SIGN_IN_CHECK_CACHE_USERS) {
      const [oldest] = this.checkedAt.keys();
      this.checkedAt.delete(oldest);
    }
  }

  /**
   * What a user earned in one community, newest first. A slug no longer in
   * the catalog is left out.
   */
  async inCommunity(
    userId: string,
    communityId: string,
  ): Promise<EarnedAchievementView[]> {
    const rows = await this.db.userAchievement.findMany({
      where: { userId, communityId },
      orderBy: { earnedAt: "desc" },
    });
    return rows.flatMap((row) => {
      const definition = findAchievement(row.slug);
      return definition
        ? [{ ...definition, id: row.id, earnedAt: row.earnedAt }]
        : [];
    });
  }
}
