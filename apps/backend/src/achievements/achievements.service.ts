import { Injectable } from "@nestjs/common";
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

/** The most users remembered as checked; the least recent go first. */
const SIGN_IN_CHECK_CACHE_USERS = 10_000;

@Injectable()
export class AchievementsService {
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
   * left as it was. A user checked within the last hour is not checked again.
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
    if (earned.length) {
      await this.db.userAchievement.createMany({
        data: earned.map((e) => ({ ...e, userId, earnedAt: now })),
        skipDuplicates: true,
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
