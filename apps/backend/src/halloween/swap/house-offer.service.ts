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
  HALLOWEEN_HOSTS,
  HOST_CANDIES,
  HOUSE_OFFER_CANDIES,
  HOUSE_OFFER_LIFETIME_MS,
  MAX_HOUSE_DROP,
  dueHouseSpawns,
  otherHost,
  type HalloweenHost,
} from "./house-offers";

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
      await this.db.$transaction(async (tx) => {
        const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(hashtextextended(${lockKey(guildId)}, 0)) AS "locked"
        `;
        if (!locked) return;
        await this.expire(tx, guildId, now);
        if (!ongoing) return;
        const [open, last] = await Promise.all([
          tx.halloweenCandyOffer.count({
            where: {
              guildId,
              host: { not: null },
              status: HalloweenCandyOfferStatus.OPEN,
            },
          }),
          tx.halloweenCandyOffer.findFirst({
            where: { guildId, host: { not: null } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
          }),
        ]);
        const due = dueHouseSpawns(last?.createdAt ?? null, now, open);
        for (const at of due) await this.spawn(tx, guildId, at);
        if (due.length) this.logSpawned(guildId, due.length, false);
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
   * Puts up `count` house offers now, whatever the pool holds and whether or
   * not the event runs. Returns how many.
   */
  async drop(communityId: string, count: number): Promise<number> {
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
        for (let i = 0; i < count; i++) await this.spawn(tx, guildId, now);
      },
      { timeout: 15_000 },
    );
    this.logSpawned(guildId, count, true);
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
    await tx.halloweenCandyOffer.updateMany({
      where: { id: { in: ids } },
      data: { status: HalloweenCandyOfferStatus.EXPIRED, closedAt: now },
    });
    // The house's candies were never anyone's, and stay that way.
    await tx.halloweenCandy.updateMany({
      where: { offerId: { in: ids } },
      data: { offerId: null },
    });
    this.logger.log({
      event: HalloweenLogEvent.HouseOffersExpired,
      message: "House offers expired",
      guildId,
      count: ids.length,
    } satisfies HalloweenLogLine);
  }

  /**
   * One house offer, dated `at`: a random host asks for one of their own
   * kinds and gives three random candies of the other host's.
   */
  private async spawn(
    tx: Prisma.TransactionClient,
    guildId: string,
    at: Date,
  ): Promise<void> {
    const host = HALLOWEEN_HOSTS[this.random.int(HALLOWEEN_HOSTS.length)];
    const wantSlug = await this.pickWant(tx, guildId, host);
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
   * A kind of the host's that some player here has a spare of, so somebody
   * can take the offer. Any of the host's kinds when nobody has one.
   */
  private async pickWant(
    tx: Prisma.TransactionClient,
    guildId: string,
    host: HalloweenHost,
  ): Promise<string> {
    const kinds = HOST_CANDIES[host];
    const held = await tx.halloweenCandy.findMany({
      where: {
        guildId,
        ownerId: { not: null },
        offerId: null,
        slug: { in: [...kinds] },
      },
      distinct: ["slug"],
      select: { slug: true },
    });
    const pool = held.length ? held.map((c) => c.slug) : kinds;
    return pool[this.random.int(pool.length)];
  }

  private logSpawned(guildId: string, count: number, manual: boolean): void {
    this.logger.log({
      event: HalloweenLogEvent.HouseOffersSpawned,
      message: "House offers spawned",
      guildId,
      count,
      manual,
    } satisfies HalloweenLogLine);
  }
}

function lockKey(guildId: string): string {
  return `halloween:house-offers:${guildId}`;
}
