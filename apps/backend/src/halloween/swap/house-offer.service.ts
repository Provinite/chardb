import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { HalloweenCandyOfferStatus, Prisma } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { Clock } from "../../clock/clock";
import { MissingGuildSettingsError } from "../errors";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { GuildSettingsService } from "../services/guild-settings.service";
import { HalloweenRandom } from "../random";
import { EventStatus } from "../time";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import {
  HOST_CANDIES,
  HOUSE_OFFER_CANDIES,
  HOUSE_OFFER_LIFETIME_MS,
  MAX_HOUSE_DROP,
  dueHouseSpawns,
  leastAskedWants,
  otherHost,
  type HalloweenHost,
} from "./house-offers";

/**
 * What the house may ask for, and how many open house offers already ask for
 * each kind. Spawning counts its own asks in, so a batch spreads too.
 */
interface HouseAsks {
  pools: Record<HalloweenHost, readonly string[]>;
  asked: Map<string, number>;
}

/**
 * Puts the house's offers up and takes them down. Browsing the swap tops the
 * pool up lazily while the event runs; staff can drop more by hand at any
 * time. Both share one lock per guild, so two instances never put up the
 * same due offer twice.
 */
@Injectable()
export class HouseOfferService {
  private readonly logger = new Logger(HouseOfferService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
    private readonly settings: GuildSettingsService,
    private readonly random: HalloweenRandom,
    private readonly clock: Clock,
  ) {}

  /**
   * Expires the guild's lapsed house offers, then, while the event runs,
   * puts up those due since the last. Skipped when another request is
   * already at it. Never throws: browsing goes on without it.
   */
  async topUp(guildId: string): Promise<void> {
    try {
      const settings = await this.settings
        .get(guildId)
        .catch((error: unknown) => {
          if (error instanceof MissingGuildSettingsError) return null;
          throw error;
        });
      const ongoing =
        settings !== null &&
        this.settings.eventStatus(settings) === EventStatus.Ongoing;
      const now = this.clock.now();
      // Most browses find nothing to do: check that without a transaction.
      const before = await this.pool(this.db, guildId, now);
      const dueBefore = dueHouseSpawns(before.lastAt, now, before.open);
      if (!before.lapsed && (!ongoing || !dueBefore.length)) return;
      await this.db.$transaction(async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtextextended(${lockKey(guildId)}, 0)) AS "locked"
        `;
        if (!locked) return;
        await this.expire(tx, guildId, now);
        if (!ongoing) return;
        const { open, lastAt } = await this.pool(tx, guildId, now);
        const due = dueHouseSpawns(lastAt, now, open);
        if (!due.length) return;
        const asks = await this.asks(tx, guildId);
        for (const at of due) await this.spawn(tx, guildId, at, asks);
        this.logSpawned(guildId, due.length, null);
      });
    } catch (err) {
      this.logger.warn({
        event: HalloweenLogEvent.HouseTopUpFailed,
        message: "House offer top-up failed",
        guildId,
        err,
      } satisfies HalloweenLogLine);
    }
  }

  /**
   * The guild's open house offers, when the house last offered, and whether
   * any open offer's time is up.
   */
  private async pool(
    db: Prisma.TransactionClient,
    guildId: string,
    now: Date,
  ): Promise<{ open: number; lastAt: Date | null; lapsed: boolean }> {
    const [open, last, lapsed] = await Promise.all([
      db.halloweenCandyOffer.count({
        where: {
          guildId,
          host: { not: null },
          status: HalloweenCandyOfferStatus.OPEN,
        },
      }),
      db.halloweenCandyOffer.findFirst({
        where: { guildId, host: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.halloweenCandyOffer.findFirst({
        where: {
          guildId,
          host: { not: null },
          status: HalloweenCandyOfferStatus.OPEN,
          expiresAt: { lte: now },
        },
        select: { id: true },
      }),
    ]);
    return { open, lastAt: last?.createdAt ?? null, lapsed: lapsed !== null };
  }

  /**
   * Puts up `count` house offers now, whatever the pool holds and whether or
   * not the event runs. Returns how many.
   */
  async drop(
    communityId: string,
    count: number,
    userId: string,
  ): Promise<number> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    if (!Number.isInteger(count) || count < 1 || count > MAX_HOUSE_DROP) {
      throw new BadRequestException(
        `Drop between 1 and ${MAX_HOUSE_DROP} offers`,
      );
    }
    const now = this.clock.now();
    await this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey(guildId)}, 0))`;
        await this.expire(tx, guildId, now);
        const asks = await this.asks(tx, guildId);
        for (let i = 0; i < count; i++) {
          await this.spawn(tx, guildId, now, asks);
        }
      },
      { timeout: 15_000 },
    );
    this.logSpawned(guildId, count, userId);
    return count;
  }

  /** Closes the guild's open house offers whose time is up. */
  private async expire(
    tx: Prisma.TransactionClient,
    guildId: string,
    now: Date,
  ): Promise<void> {
    const lapsed = await tx.halloweenCandyOffer.findMany({
      where: {
        guildId,
        host: { not: null },
        status: HalloweenCandyOfferStatus.OPEN,
        expiresAt: { lte: now },
      },
      select: { id: true },
    });
    if (!lapsed.length) return;
    const ids = lapsed.map((o) => o.id);
    // Still open: one taken since it was read above keeps its FILLED.
    const { count } = await tx.halloweenCandyOffer.updateMany({
      where: { id: { in: ids }, status: HalloweenCandyOfferStatus.OPEN },
      data: { status: HalloweenCandyOfferStatus.EXPIRED, closedAt: now },
    });
    // The house made these for the offer and nobody ever had them. A taken
    // offer's candies left it, so only an expired one's are still here.
    await tx.halloweenCandy.deleteMany({
      where: { offerId: { in: ids }, ownerId: null },
    });
    this.logger.log({
      event: HalloweenLogEvent.HouseOffersExpired,
      message: "House offers expired",
      guildId,
      count,
    } satisfies HalloweenLogLine);
  }

  /**
   * One house offer, dated `at`: a host asks for one of their own kinds, one
   * the open offers ask for least, and gives three random candies of the
   * other host's.
   */
  private async spawn(
    tx: Prisma.TransactionClient,
    guildId: string,
    at: Date,
    asks: HouseAsks,
  ): Promise<void> {
    const wants = leastAskedWants(asks.pools, asks.asked);
    const { host, slug: wantSlug } = wants[this.random.int(wants.length)];
    asks.asked.set(wantSlug, (asks.asked.get(wantSlug) ?? 0) + 1);
    const gives = HOST_CANDIES[otherHost(host)];
    const offer = await tx.halloweenCandyOffer.create({
      data: {
        guildId,
        ownerId: null,
        host,
        wantSlug,
        candyCount: HOUSE_OFFER_CANDIES,
        createdAt: at,
        expiresAt: new Date(at.getTime() + HOUSE_OFFER_LIFETIME_MS),
      },
    });
    await tx.halloweenCandy.createMany({
      data: Array.from({ length: HOUSE_OFFER_CANDIES }, () => ({
        guildId,
        slug: gives[this.random.int(gives.length)],
        ownerId: null,
        claimedAt: at,
        receivedAt: at,
        offerId: offer.id,
      })),
    });
  }

  /**
   * What each host may ask for: their kinds that some player here has a
   * spare of, so somebody can take the offer, or all their kinds when nobody
   * has one. With how often the open house offers ask for each kind.
   */
  private async asks(
    tx: Prisma.TransactionClient,
    guildId: string,
  ): Promise<HouseAsks> {
    const [held, open] = await Promise.all([
      tx.$queryRaw<{ slug: string }[]>`
        SELECT DISTINCT "slug" FROM "halloween_candies"
        WHERE "guild_id" = ${guildId}
          AND "owner_id" IS NOT NULL
          AND "offer_id" IS NULL
      `,
      tx.halloweenCandyOffer.groupBy({
        by: ["wantSlug"],
        where: {
          guildId,
          host: { not: null },
          status: HalloweenCandyOfferStatus.OPEN,
        },
        _count: { _all: true },
      }),
    ]);
    const slugs = new Set(held.map((c) => c.slug));
    const poolFor = (host: HalloweenHost) => {
      const kinds = HOST_CANDIES[host].filter((slug) => slugs.has(slug));
      return kinds.length ? kinds : HOST_CANDIES[host];
    };
    const asked = new Map<string, number>();
    for (const row of open) {
      if (row.wantSlug) asked.set(row.wantSlug, row._count._all);
    }
    return {
      pools: { Daphne: poolFor("Daphne"), Luther: poolFor("Luther") },
      asked,
    };
  }

  /** `userId` is the staff member who dropped them; null for the top-up. */
  private logSpawned(
    guildId: string,
    count: number,
    userId: string | null,
  ): void {
    this.logger.log({
      event: HalloweenLogEvent.HouseOffersSpawned,
      message: "House offers spawned",
      guildId,
      count,
      manual: userId !== null,
      userId,
    } satisfies HalloweenLogLine);
  }
}

function lockKey(guildId: string): string {
  return `halloween:house-offers:${guildId}`;
}
