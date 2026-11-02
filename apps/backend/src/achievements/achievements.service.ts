import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { Clock } from "../clock/clock";
import { OnDomainEvent } from "../events/domain-events";
import type { UserSignedIn } from "../events/domain-event-map";
import {
  findAchievement,
  type AchievementDefinition,
} from "./achievement-catalog";
import { AchievementGrants } from "./achievement-grants";
import { HalloweenPlayAchievements } from "./halloween-play-achievements.service";
import { signInAchievements } from "./sign-in-achievements";

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
    private readonly grants: AchievementGrants,
    private readonly halloweenPlay: HalloweenPlayAchievements,
  ) {}

  @OnDomainEvent("user.signed_in")
  async onSignedIn({ userId }: UserSignedIn): Promise<void> {
    await this.recordSignIn(userId);
  }

  /**
   * Grants what signing in now earns: trick-or-treater for each community
   * the user belongs to whose Halloween event is on, and whatever their play
   * in each event that has started has earned and not yet been granted. A
   * user with an event started is not checked again for an hour.
   */
  async recordSignIn(userId: string): Promise<void> {
    const now = this.clock.now();
    const last = this.checkedAt.get(userId);
    if (last !== undefined && now.getTime() - last < SIGN_IN_CHECK_TTL_MS) {
      return;
    }

    const players = await this.halloweenPlay.playerIn(userId);
    await this.grants.grant(
      signInAchievements(players, now).map((e) => ({ ...e, userId })),
      "sign-in",
    );
    const started = players.filter((p) => p.startDate <= now);
    for (const player of started) {
      await this.halloweenPlay.grantFor(player, "sign-in");
    }
    // Nothing started is not remembered: the event may start, or the user
    // join a community, before an hour is up, and the next page load should
    // catch it.
    if (started.length) this.remember(userId, now.getTime());
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
