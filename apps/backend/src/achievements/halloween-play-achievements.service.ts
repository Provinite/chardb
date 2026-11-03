import { Injectable } from "@nestjs/common";
import { ExternalAccountProvider, Prisma } from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { OnDomainEvent } from "../events/domain-events";
import type {
  HalloweenCandyOfferPlaced,
  HalloweenCandyTraded,
  HalloweenGiftySent,
  HalloweenKnockByDiscordUser,
} from "../events/domain-event-map";
import { eventYear } from "../halloween/time";
import { AchievementGrants } from "./achievement-grants";
import {
  halloweenPlaySlugs,
  knockedEveryDay,
  type HalloweenPlay,
} from "./halloween-play-achievements";

/**
 * A member's part in one community's Halloween event: who they are on
 * Discord, if linked, and the event's dates.
 */
export interface HalloweenPlayer {
  userId: string;
  communityId: string;
  guildId: string;
  /** Null when they have not linked Discord: knocks and gifties are not theirs yet. */
  discordUserId: string | null;
  startDate: Date;
  endDate: Date | null;
  resetTime: number;
}

/**
 * Grants what playing Trick-or-Treat earns. Everything is worked out afresh
 * from the event's rows, between its start and end, so it can run any number
 * of times: after each thing a player does, and on signing in to catch up on
 * whatever was missed, done before linking Discord, or done before these
 * achievements existed.
 */
@Injectable()
export class HalloweenPlayAchievements {
  constructor(
    private readonly db: DatabaseService,
    private readonly grants: AchievementGrants,
  ) {}

  @OnDomainEvent("halloween.candy.traded")
  async onTraded({
    guildId,
    initiatorId,
    offererId,
  }: HalloweenCandyTraded): Promise<void> {
    for (const userId of [initiatorId, offererId]) {
      if (userId) await this.forUser(userId, guildId, "candy-traded");
    }
  }

  @OnDomainEvent("halloween.candy_offer.placed")
  async onOfferPlaced({
    guildId,
    userId,
  }: HalloweenCandyOfferPlaced): Promise<void> {
    await this.forUser(userId, guildId, "candy-offer-placed");
  }

  @OnDomainEvent("halloween.gifty.sent")
  async onGiftySent({
    guildId,
    fromDiscordUserId,
  }: HalloweenGiftySent): Promise<void> {
    await this.forDiscordUser(guildId, fromDiscordUserId, "gifty-sent");
  }

  @OnDomainEvent("halloween.knock.completed")
  async onKnocked({
    guildId,
    discordUserId,
  }: HalloweenKnockByDiscordUser): Promise<void> {
    await this.forDiscordUser(guildId, discordUserId, "knock");
  }

  @OnDomainEvent("halloween.knock.out_of_knocks")
  async onOutOfKnocks({
    guildId,
    discordUserId,
  }: HalloweenKnockByDiscordUser): Promise<void> {
    await this.forDiscordUser(guildId, discordUserId, "out-of-knocks");
  }

  /**
   * Each community with Halloween on that the user belongs to, with its
   * event, if it has a start date; only the one linked to `guildId` when
   * given.
   */
  async playerIn(userId: string, guildId?: string): Promise<HalloweenPlayer[]> {
    const inGuild = guildId
      ? Prisma.sql`AND c.discord_guild_id = ${guildId}`
      : Prisma.empty;
    return this.db.$queryRaw<HalloweenPlayer[]>`
      SELECT ${userId} AS "userId",
             c.id AS "communityId",
             c.discord_guild_id AS "guildId",
             (
               SELECT ea.provider_account_id
               FROM "external_accounts" ea
               WHERE ea.user_id = ${userId}
                 AND ea.provider = ${ExternalAccountProvider.DISCORD}::"ExternalAccountProvider"
             ) AS "discordUserId",
             s.start_date AS "startDate",
             s.end_date AS "endDate",
             s.reset_time AS "resetTime"
      FROM "communities" c
      JOIN "halloween_guild_settings" s ON s.guild_id = c.discord_guild_id
      WHERE c.halloween_enabled
        AND s.start_date IS NOT NULL
        ${inGuild}
        AND EXISTS (
          SELECT 1
          FROM "community_members" m
          JOIN "roles" r ON r.id = m.role_id
          WHERE r.community_id = c.id AND m.user_id = ${userId}
        )
    `;
  }

  /** Grants what this player has earned in their event so far. */
  async grantFor(player: HalloweenPlayer, reason: string): Promise<void> {
    const slugs = halloweenPlaySlugs(
      await this.play(player),
      eventYear(player.startDate),
    );
    await this.grants.grant(
      slugs.map((slug) => ({
        userId: player.userId,
        communityId: player.communityId,
        slug,
      })),
      reason,
    );
  }

  private async forUser(
    userId: string,
    guildId: string,
    reason: string,
  ): Promise<void> {
    for (const player of await this.playerIn(userId, guildId)) {
      await this.grantFor(player, reason);
    }
  }

  /** Nothing until the Discord player has linked a chardb account. */
  private async forDiscordUser(
    guildId: string,
    discordUserId: string,
    reason: string,
  ): Promise<void> {
    const account = await this.db.externalAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: discordUserId,
        },
      },
      select: { userId: true },
    });
    if (account) await this.forUser(account.userId, guildId, reason);
  }

  private async play(player: HalloweenPlayer): Promise<HalloweenPlay> {
    const { userId, guildId, discordUserId, startDate, endDate } = player;
    const during = { gte: startDate, ...(endDate ? { lte: endDate } : {}) };
    const [trades, offeredThreeForOne, tookThreeForOne] = await Promise.all([
      this.db.halloweenCandyTrade.count({
        where: {
          guildId,
          createdAt: during,
          OR: [{ initiatorId: userId }, { offererId: userId }],
        },
      }),
      this.db.halloweenCandyOffer.findFirst({
        where: {
          guildId,
          ownerId: userId,
          candyCount: { gte: 3 },
          createdAt: during,
        },
        select: { id: true },
      }),
      this.tookThreeForOne(player),
    ]);
    const discordPlay = discordUserId
      ? await this.discordPlay({ ...player, discordUserId }, during)
      : {
          giftedSelf: false,
          knockedEveryDay: false,
          knockedWithNoneLeft: false,
        };
    return {
      trades,
      offeredThreeForOne: offeredThreeForOne !== null,
      tookThreeForOne,
      ...discordPlay,
    };
  }

  /** Whether they accepted an offer that gave them three candies. */
  private async tookThreeForOne({
    userId,
    guildId,
    startDate,
    endDate,
  }: HalloweenPlayer): Promise<boolean> {
    const [{ found }] = await this.db.$queryRaw<{ found: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM "halloween_candy_trades" t
        WHERE t.guild_id = ${guildId}
          AND t.initiator_id = ${userId}
          AND t.created_at >= ${startDate}
          AND (${endDate}::timestamptz IS NULL OR t.created_at <= ${endDate})
          AND (
            SELECT COUNT(*)
            FROM "halloween_candy_trade_lines" l
            WHERE l.trade_id = t.id AND l.to_initiator
          ) >= 3
      ) AS found
    `;
    return found;
  }

  private async discordPlay(
    player: HalloweenPlayer & { discordUserId: string },
    during: Prisma.DateTimeFilter,
  ): Promise<
    Pick<
      HalloweenPlay,
      "giftedSelf" | "knockedEveryDay" | "knockedWithNoneLeft"
    >
  > {
    const { guildId, discordUserId } = player;
    const [selfGifty, attempt, knocks] = await Promise.all([
      this.db.halloweenGifty.findFirst({
        where: {
          guildId,
          fromUserId: discordUserId,
          toUserId: discordUserId,
          time: during,
        },
        select: { id: true },
      }),
      this.db.halloweenOutOfKnocksAttempt.findFirst({
        where: { guildId, discordUserId, time: during },
        select: { id: true },
      }),
      // Only an event with an end has every day to knock on.
      player.endDate
        ? this.db.halloweenKnockEvent.findMany({
            where: { guildId, userId: discordUserId, time: during },
            select: { time: true },
          })
        : [],
    ]);
    return {
      giftedSelf: selfGifty !== null,
      knockedWithNoneLeft: attempt !== null,
      knockedEveryDay: knockedEveryDay(
        knocks.map((k) => k.time),
        player,
      ),
    };
  }
}
