import { Injectable, Logger } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Clock } from "../clock/clock";

/** The `event` field of achievement log lines, for searching. */
export const AchievementLogEvent = {
  /** A user earned an achievement; `reason` says how. */
  Granted: "achievements.granted",
} as const;

export interface AchievementGrant {
  userId: string;
  communityId: string;
  slug: string;
  /** When it was earned, if not now. */
  earnedAt?: Date;
}

/** Records achievements as earned. */
@Injectable()
export class AchievementGrants {
  private readonly logger = new Logger(AchievementGrants.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly clock: Clock,
  ) {}

  /**
   * Grants each achievement not already earned; one already earned is left
   * as it was. `reason` is logged with each one granted.
   */
  async grant(
    grants: readonly AchievementGrant[],
    reason: string,
  ): Promise<void> {
    if (!grants.length) return;
    // Returns only the rows it inserted, so one already earned is not logged
    // as granted again.
    const granted = await this.db.userAchievement.createManyAndReturn({
      data: grants.map((g) => ({
        ...g,
        earnedAt: g.earnedAt ?? this.clock.now(),
      })),
      skipDuplicates: true,
      select: { userId: true, communityId: true, slug: true },
    });
    for (const row of granted) {
      this.logger.log({
        event: AchievementLogEvent.Granted,
        message: "Achievement granted",
        ...row,
        reason,
      });
    }
  }
}
