import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  HalloweenCandyOfferStatus,
  NotificationKind,
  NotificationSubjectType,
  Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { NotificationsService } from "../../notifications/notifications.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { CANDY_SLUGS } from "../discord/images.generated";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { PlayerLock } from "../services/player-lock";
import type { HalloweenCandy } from "../board/candy-board.types";
import type {
  HalloweenCandyOffer,
  HalloweenCandyOfferPlaced,
  HalloweenCandyTradeRecord,
} from "./candy-swap.types";

/** The most offers a player may have open at once. */
export const MAX_OPEN_OFFERS = 10;
/** The most candies one offer gives. */
export const MAX_OFFERED_CANDIES = 3;
/** How many offers browsing shows when not told. */
export const DEFAULT_BROWSE_LIMIT = 12;
const MAX_BROWSE_LIMIT = 50;
/** How many past trades the history shows. */
const HISTORY_LIMIT = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const candySelect = { id: true, slug: true, receivedAt: true } as const;

const offerInclude = {
  candies: { select: candySelect, orderBy: { id: "asc" } },
} as const satisfies Prisma.HalloweenCandyOfferInclude;

type OfferRow = Prisma.HalloweenCandyOfferGetPayload<{
  include: typeof offerInclude;
}>;

const tradeInclude = {
  initiator: { select: userMapperSelect },
  offerer: { select: userMapperSelect },
  lines: { select: { slug: true, toInitiator: true }, orderBy: { id: "asc" } },
} as const satisfies Prisma.HalloweenCandyTradeInclude;

type TradeRow = Prisma.HalloweenCandyTradeGetPayload<{
  include: typeof tradeInclude;
}>;

/** One side's half of a swap: who, and the candies they hand over. */
interface Side {
  userId: string;
  candies: { id: number; slug: string }[];
}

/**
 * The candy swap. A player offers 1-3 of their candies for one candy of a
 * kind they want; the offered candies are held while the offer is open.
 * Another player fills it by accepting it, giving one candy of the wanted
 * kind for the whole bundle, or -- for a one-for-one offer only -- by placing
 * the mirror offer, which trades at once.
 *
 * Every change runs under the acting player's swap lock, so one player's
 * offers, cancellations and acceptances apply one at a time. An offer row is
 * locked before it is filled or cancelled, so two players cannot both have
 * it.
 */
@Injectable()
export class CandySwapService {
  private readonly logger = new Logger(CandySwapService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
    private readonly lock: PlayerLock,
    private readonly notifications: NotificationsService,
  ) {}

  /** Every kind of candy there is, by slug. */
  candyTypes(): readonly string[] {
    return CANDY_SLUGS;
  }

  /** The player's candies here that are not held in an offer, oldest first. */
  async myCandies(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandy[]> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    return this.db.halloweenCandy.findMany({
      where: { guildId, ownerId: userId, offerId: null },
      orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
      select: candySelect,
    });
  }

  /** The player's open offers here, newest first. */
  async myOffers(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandyOffer[]> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const offers = await this.db.halloweenCandyOffer.findMany({
      where: {
        guildId,
        ownerId: userId,
        status: HalloweenCandyOfferStatus.OPEN,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      include: offerInclude,
    });
    return offers.map(toOffer);
  }

  /**
   * A random handful of other players' open offers that the player holds a
   * spare candy of the wanted kind for.
   */
  async browse(
    communityId: string,
    userId: string,
    limit = DEFAULT_BROWSE_LIMIT,
  ): Promise<HalloweenCandyOffer[]> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const take = Math.max(1, Math.min(limit, MAX_BROWSE_LIMIT));
    const picked = await this.db.$queryRaw<{ id: string }[]>`
      SELECT o."id"
      FROM "halloween_candy_offers" o
      WHERE o."guild_id" = ${guildId}
        AND o."status" = 'OPEN'
        AND o."owner_id" <> ${userId}
        AND o."want_slug" IN (
          SELECT c."slug" FROM "halloween_candies" c
          WHERE c."guild_id" = ${guildId}
            AND c."owner_id" = ${userId}
            AND c."offer_id" IS NULL
        )
      ORDER BY random()
      LIMIT ${take}
    `;
    if (!picked.length) return [];
    const offers = await this.db.halloweenCandyOffer.findMany({
      where: { id: { in: picked.map((p) => p.id) } },
      include: offerInclude,
    });
    const order = new Map(picked.map((p, i) => [p.id, i]));
    return offers
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map(toOffer);
  }

  /** The trades the player took part in here, newest first. */
  async myTrades(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandyTradeRecord[]> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const trades = await this.db.halloweenCandyTrade.findMany({
      where: {
        guildId,
        OR: [{ initiatorId: userId }, { offererId: userId }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: HISTORY_LIMIT,
      include: tradeInclude,
    });
    return trades.map((t) => toTradeRecord(t, userId));
  }

  /**
   * Holds the given candies in a new offer for one candy of `wantSlug`. A
   * one-for-one offer that meets its mirror trades straight away.
   */
  async place(
    communityId: string,
    userId: string,
    candyIds: number[],
    wantSlug: string,
  ): Promise<HalloweenCandyOfferPlaced> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    if (candyIds.length < 1 || candyIds.length > MAX_OFFERED_CANDIES) {
      throw new BadRequestException("An offer is one to three of your candies");
    }
    if (!CANDY_SLUGS.includes(wantSlug)) {
      throw new BadRequestException("There is no such candy");
    }

    const { offerId, tradeId } = await this.db.$transaction(async (tx) => {
      await this.lock.acquire(tx, "swap", guildId, userId);

      const candies = await tx.halloweenCandy.findMany({
        where: {
          id: { in: candyIds },
          guildId,
          ownerId: userId,
          offerId: null,
        },
        select: { id: true, slug: true },
        orderBy: { id: "asc" },
      });
      if (
        new Set(candyIds).size !== candyIds.length ||
        candies.length !== candyIds.length
      ) {
        throw new BadRequestException(
          "You can only offer candies of yours that are not in another offer",
        );
      }
      if (candies.some((c) => c.slug === wantSlug)) {
        throw new BadRequestException(
          "You cannot offer a candy of the kind you are asking for",
        );
      }
      const open = await tx.halloweenCandyOffer.count({
        where: {
          guildId,
          ownerId: userId,
          status: HalloweenCandyOfferStatus.OPEN,
        },
      });
      if (open >= MAX_OPEN_OFFERS) {
        throw new BadRequestException(
          `You can have at most ${MAX_OPEN_OFFERS} open offers`,
        );
      }

      const offer = await tx.halloweenCandyOffer.create({
        data: { guildId, ownerId: userId, wantSlug },
      });
      await tx.halloweenCandy.updateMany({
        where: { id: { in: candyIds } },
        data: { offerId: offer.id },
      });

      const mirror =
        candies.length === 1
          ? await this.findMirror(
              tx,
              guildId,
              userId,
              candies[0].slug,
              wantSlug,
            )
          : null;
      if (!mirror) {
        return { offerId: offer.id, tradeId: null };
      }
      const tradeId = await this.swap(tx, communityId, guildId, {
        initiator: { userId, candies },
        initiatorOfferId: offer.id,
        offerer: { userId: mirror.ownerId, candies: [mirror.candy] },
        offererOfferId: mirror.offerId,
      });
      return { offerId: offer.id, tradeId };
    });

    this.logger.log({
      event: HalloweenLogEvent.CandyOfferPlaced,
      message: "Candy offer placed",
      guildId,
      userId,
      offerId,
      candies: candyIds.length,
      wantSlug,
      matched: tradeId !== null,
    } satisfies HalloweenLogLine);

    const [offer, trade] = await Promise.all([
      this.db.halloweenCandyOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: offerInclude,
      }),
      tradeId ? this.loadTrade(tradeId) : null,
    ]);
    return {
      offer: toOffer(offer),
      trade: trade ? toTradeRecord(trade, userId) : null,
    };
  }

  /**
   * Fills another player's open offer: the player's oldest spare candy of
   * the wanted kind for everything it offers.
   */
  async accept(
    communityId: string,
    userId: string,
    offerId: string,
  ): Promise<HalloweenCandyTradeRecord> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    if (!UUID.test(offerId)) {
      throw new NotFoundException("That offer is no longer open");
    }

    const tradeId = await this.db.$transaction(async (tx) => {
      await this.lock.acquire(tx, "swap", guildId, userId);
      await tx.$queryRaw`SELECT 1 FROM "halloween_candy_offers" WHERE "id" = ${offerId}::uuid FOR UPDATE`;
      const offer = await tx.halloweenCandyOffer.findFirst({
        where: { id: offerId, guildId, status: HalloweenCandyOfferStatus.OPEN },
        include: { candies: { select: { id: true, slug: true } } },
      });
      if (!offer) {
        throw new ConflictException("That offer is no longer open");
      }
      if (offer.ownerId === userId) {
        throw new BadRequestException("You cannot accept your own offer");
      }
      const payment = await tx.halloweenCandy.findFirst({
        where: {
          guildId,
          ownerId: userId,
          offerId: null,
          slug: offer.wantSlug,
        },
        orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
        select: { id: true, slug: true },
      });
      if (!payment) {
        throw new BadRequestException(
          "You have no spare candy of the kind this offer asks for",
        );
      }
      return this.swap(tx, communityId, guildId, {
        initiator: { userId, candies: [payment] },
        initiatorOfferId: null,
        offerer: { userId: offer.ownerId, candies: offer.candies },
        offererOfferId: offer.id,
      });
    });

    return toTradeRecord(await this.loadTrade(tradeId), userId);
  }

  /** Withdraws one of the player's open offers, giving its candies back. */
  async cancel(
    communityId: string,
    userId: string,
    offerId: string,
  ): Promise<boolean> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const gone = new NotFoundException("There is no such open offer of yours");
    if (!UUID.test(offerId)) throw gone;

    await this.db.$transaction(async (tx) => {
      await this.lock.acquire(tx, "swap", guildId, userId);
      await tx.$queryRaw`SELECT 1 FROM "halloween_candy_offers" WHERE "id" = ${offerId}::uuid FOR UPDATE`;
      const { count } = await tx.halloweenCandyOffer.updateMany({
        where: {
          id: offerId,
          guildId,
          ownerId: userId,
          status: HalloweenCandyOfferStatus.OPEN,
        },
        data: {
          status: HalloweenCandyOfferStatus.CANCELLED,
          closedAt: new Date(),
        },
      });
      if (count === 0) throw gone;
      await tx.halloweenCandy.updateMany({
        where: { offerId },
        data: { offerId: null },
      });
    });

    this.logger.log({
      event: HalloweenLogEvent.CandyOfferCancelled,
      message: "Candy offer cancelled",
      guildId,
      userId,
      offerId,
    } satisfies HalloweenLogLine);
    return true;
  }

  /**
   * Another player's open one-for-one offer that gives `wantSlug` for
   * `giveSlug`, picked at random and locked. One being filled or cancelled
   * by someone else right now is passed over rather than waited for.
   */
  private async findMirror(
    tx: Prisma.TransactionClient,
    guildId: string,
    userId: string,
    giveSlug: string,
    wantSlug: string,
  ): Promise<{
    offerId: string;
    ownerId: string;
    candy: { id: number; slug: string };
  } | null> {
    const candidates = await tx.$queryRaw<
      { offerId: string; ownerId: string; candyId: number }[]
    >`
      SELECT o."id" AS "offerId", o."owner_id" AS "ownerId", MIN(c."id") AS "candyId"
      FROM "halloween_candy_offers" o
      JOIN "halloween_candies" c ON c."offer_id" = o."id"
      WHERE o."guild_id" = ${guildId}
        AND o."status" = 'OPEN'
        AND o."want_slug" = ${giveSlug}
        AND o."owner_id" <> ${userId}
      GROUP BY o."id", o."owner_id"
      HAVING COUNT(*) = 1 AND MIN(c."slug") = ${wantSlug}
      ORDER BY random()
    `;
    // A grouped query cannot take FOR UPDATE, so each candidate is locked on
    // its own, and the first still open and not locked by anyone else wins.
    for (const candidate of candidates) {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "halloween_candy_offers"
        WHERE "id" = ${candidate.offerId}::uuid AND "status" = 'OPEN'
        FOR UPDATE SKIP LOCKED
      `;
      if (locked.length) {
        return {
          offerId: candidate.offerId,
          ownerId: candidate.ownerId,
          candy: { id: candidate.candyId, slug: wantSlug },
        };
      }
    }
    return null;
  }

  /**
   * Moves each side's candies to the other, closes the offers the trade
   * fills, records it, and tells the offerer. Returns the trade's id.
   */
  private async swap(
    tx: Prisma.TransactionClient,
    communityId: string,
    guildId: string,
    {
      initiator,
      initiatorOfferId,
      offerer,
      offererOfferId,
    }: {
      initiator: Side;
      initiatorOfferId: string | null;
      offerer: Side;
      offererOfferId: string;
    },
  ): Promise<string> {
    const now = new Date();
    const trade = await tx.halloweenCandyTrade.create({
      data: {
        guildId,
        initiatorId: initiator.userId,
        offererId: offerer.userId,
        createdAt: now,
        lines: {
          create: [
            ...offerer.candies.map((c) => ({
              candyId: c.id,
              slug: c.slug,
              toInitiator: true,
            })),
            ...initiator.candies.map((c) => ({
              candyId: c.id,
              slug: c.slug,
              toInitiator: false,
            })),
          ],
        },
      },
    });
    await tx.halloweenCandy.updateMany({
      where: { id: { in: offerer.candies.map((c) => c.id) } },
      data: { ownerId: initiator.userId, offerId: null, receivedAt: now },
    });
    await tx.halloweenCandy.updateMany({
      where: { id: { in: initiator.candies.map((c) => c.id) } },
      data: { ownerId: offerer.userId, offerId: null, receivedAt: now },
    });
    await tx.halloweenCandyOffer.updateMany({
      where: {
        id: {
          in: [offererOfferId, ...(initiatorOfferId ? [initiatorOfferId] : [])],
        },
      },
      data: {
        status: HalloweenCandyOfferStatus.FILLED,
        closedAt: now,
        tradeId: trade.id,
      },
    });
    await this.notifications.create(
      {
        recipientId: offerer.userId,
        kind: NotificationKind.HALLOWEEN_CANDY_TRADED,
        actorUserId: initiator.userId,
        communityId,
        subjectType: NotificationSubjectType.HALLOWEEN_CANDY_TRADE,
        subjectId: trade.id,
        data: { count: initiator.candies.length },
      },
      tx,
    );

    this.logger.log({
      event: HalloweenLogEvent.CandyTraded,
      message: "Candies traded",
      guildId,
      tradeId: trade.id,
      initiatorId: initiator.userId,
      offererId: offerer.userId,
      offerId: offererOfferId,
      matched: initiatorOfferId !== null,
    } satisfies HalloweenLogLine);
    return trade.id;
  }

  private loadTrade(id: string): Promise<TradeRow> {
    return this.db.halloweenCandyTrade.findUniqueOrThrow({
      where: { id },
      include: tradeInclude,
    });
  }
}

function toOffer(offer: OfferRow): HalloweenCandyOffer {
  return {
    id: offer.id,
    wantSlug: offer.wantSlug,
    status: offer.status,
    candies: offer.candies,
    createdAt: offer.createdAt,
  };
}

/** A trade as `viewerId`, one of its two sides, saw it. */
function toTradeRecord(
  trade: TradeRow,
  viewerId: string,
): HalloweenCandyTradeRecord {
  const viewerInitiated = trade.initiatorId === viewerId;
  const other = viewerInitiated ? trade.offerer : trade.initiator;
  const slugs = (toViewer: boolean) =>
    trade.lines
      .filter((l) => l.toInitiator === (viewerInitiated === toViewer))
      .map((l) => l.slug);
  return {
    id: trade.id,
    with: other ? mapPrismaUserToGraphQL(other) : null,
    gave: slugs(false),
    received: slugs(true),
    createdAt: trade.createdAt,
  };
}
