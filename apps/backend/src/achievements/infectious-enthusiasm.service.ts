import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { OnDomainEvent } from "../events/domain-events";
import type { HalloweenCandyTraded } from "../events/domain-event-map";
import { eventYear } from "../halloween/time";
import { AchievementGrants } from "./achievement-grants";
import { findAchievement, halloweenPlaySlug } from "./achievement-catalog";
import {
  HalloweenPlayAchievements,
  type HalloweenPlayer,
} from "./halloween-play-achievements.service";

/**
 * Infectious Enthusiasm passes from whoever has it to whoever they swap
 * candy with. Who had it is judged as of the swap, so the two sides of one
 * swap cannot pass it back and forth.
 *
 * Unlike the other play achievements this depends on the order swaps
 * happened in, so it is not worked out afresh on signing in. Staff and site
 * admins were given it, and the swaps before it existed replayed, by the
 * `infectious_enthusiasm_seed` migration.
 */
@Injectable()
export class InfectiousEnthusiasm {
  constructor(
    private readonly db: DatabaseService,
    private readonly grants: AchievementGrants,
    private readonly halloweenPlay: HalloweenPlayAchievements,
  ) {}

  @OnDomainEvent("halloween.candy.traded")
  async onTraded({
    guildId,
    tradeId,
    initiatorId,
    offererId,
  }: HalloweenCandyTraded): Promise<void> {
    if (!initiatorId || !offererId) return;
    const trade = await this.db.halloweenCandyTrade.findUnique({
      where: { id: tradeId },
      select: { createdAt: true },
    });
    if (!trade) return;

    const sides = await Promise.all(
      [initiatorId, offererId].map((userId) =>
        this.side(userId, guildId, trade.createdAt),
      ),
    );
    const [initiator, offerer] = sides;
    // Both judged before either is granted.
    const catchers = [
      initiator && offerer?.carried && !initiator.carried ? initiator : null,
      offerer && initiator?.carried && !offerer.carried ? offerer : null,
    ].flatMap((s) => (s ? [s] : []));
    await this.grants.grant(
      catchers.map(({ player, slug }) => ({
        userId: player.userId,
        communityId: player.communityId,
        slug,
        // Dated at the swap, as the seed migration's replay dates it.
        earnedAt: trade.createdAt,
      })),
      "infected",
    );
  }

  /**
   * One side of a swap, if they are a member and the swap falls in their
   * event: whether they had it by then.
   */
  private async side(
    userId: string,
    guildId: string,
    at: Date,
  ): Promise<{
    player: HalloweenPlayer;
    slug: string;
    carried: boolean;
  } | null> {
    const [player] = await this.halloweenPlay.playerIn(userId, guildId);
    if (
      !player ||
      at < player.startDate ||
      (player.endDate && at > player.endDate)
    ) {
      return null;
    }
    const slug = halloweenPlaySlug(
      eventYear(player.startDate),
    ).infectiousEnthusiasm;
    if (!findAchievement(slug)) return null;
    const had = await this.db.userAchievement.findFirst({
      where: {
        userId,
        communityId: player.communityId,
        slug,
        earnedAt: { lte: at },
      },
      select: { id: true },
    });
    return { player, slug, carried: had !== null };
  }
}
