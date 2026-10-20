import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ExternalAccountProvider,
  type HalloweenPrize,
  type Prisma,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import { PrizeImageService } from "../services/prize-image.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import {
  HalloweenDashboard,
  HalloweenPrizeDelivery,
  HalloweenPrizeView,
  HalloweenWin,
  HalloweenWinFilter,
  HalloweenWinPage,
} from "./halloween-dashboard.types";

const winInclude = {
  prize: true,
  gifties: { select: { fromUserId: true }, take: 1 },
  deliveredBy: { select: userMapperSelect },
} satisfies Prisma.HalloweenKnockEventInclude;

type WinRow = Prisma.HalloweenKnockEventGetPayload<{
  include: typeof winInclude;
}>;

/** The most wins one page of the feed returns, whatever the caller asks. */
const MAX_WINS_PAGE = 100;

/** A prize nothing delivers but staff. */
const staffPrize = {
  is: { itemTypeId: null, characterId: null },
} satisfies Prisma.HalloweenPrizeNullableRelationFilter;

function winsWhere(
  guildId: string,
  filter: HalloweenWinFilter,
): Prisma.HalloweenKnockEventWhereInput {
  const win = { guildId, prizeId: { not: null }, isPending: false };
  switch (filter) {
    case HalloweenWinFilter.NEEDS_DELIVERY:
      return { ...win, prize: staffPrize, deliveredAt: null };
    case HalloweenWinFilter.DELIVERED:
      return { ...win, deliveredAt: { not: null } };
    default:
      return win;
  }
}

export function prizeDelivery(
  prize: Pick<HalloweenPrize, "itemTypeId" | "characterId">,
): HalloweenPrizeDelivery {
  if (prize.itemTypeId) return HalloweenPrizeDelivery.CHARDB_ITEM;
  if (prize.characterId) return HalloweenPrizeDelivery.CHARDB_CHARACTER;
  return HalloweenPrizeDelivery.STAFF;
}

function toPrizeView(
  prize: HalloweenPrize,
  image: string | null,
): HalloweenPrizeView {
  return {
    id: prize.id,
    name: prize.name,
    initialStock: prize.initialStock,
    currentStock: prize.currentStock,
    weight: prize.weight,
    image,
    delivery: prizeDelivery(prize),
    itemTypeId: prize.itemTypeId,
    characterId: prize.characterId,
  };
}

/**
 * What staff see of the event: the bot's old "prize feed" page, plus the pool
 * and which prizes still need handing over.
 *
 * The event's data is keyed by Discord guild, so a community sees whatever
 * its linked Discord server has done.
 */
@Injectable()
export class HalloweenDashboardService {
  private readonly logger = new Logger(HalloweenDashboardService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly prizeImages: PrizeImageService,
  ) {}

  /**
   * The community's linked guild, null if none, once the event is enabled for
   * it. Every Halloween operation on chardb starts here.
   */
  async guildFor(communityId: string): Promise<string | null> {
    const community = await this.db.community.findUnique({
      where: { id: communityId },
      select: { halloweenEnabled: true, discordGuildId: true },
    });
    if (!community) {
      throw new NotFoundException("Community not found");
    }
    if (!community.halloweenEnabled) {
      throw new ForbiddenException(
        "The Halloween event is not enabled for this community",
      );
    }
    return community.discordGuildId;
  }

  /** As {@link guildFor}, for changes, which need a guild to belong to. */
  async linkedGuildFor(communityId: string): Promise<string> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) {
      throw new BadRequestException(
        "Link a Discord server to this community first",
      );
    }
    return guildId;
  }

  async getDashboard(communityId: string): Promise<HalloweenDashboard> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) {
      return {
        communityId,
        guildId: null,
        settings: null,
        summary: {
          knocks: 0,
          wins: 0,
          giftiesSent: 0,
          players: 0,
          toDeliver: 0,
        },
        prizes: [],
      };
    }

    const [settings, prizes, knocks, wins, toDeliver, giftiesSent, players] =
      await Promise.all([
        this.db.halloweenGuildSettings.findUnique({ where: { guildId } }),
        this.db.halloweenPrize.findMany({
          where: { guildId },
          orderBy: { id: "asc" },
        }),
        this.db.halloweenKnockEvent.count({ where: { guildId } }),
        this.db.halloweenKnockEvent.count({
          where: winsWhere(guildId, HalloweenWinFilter.ALL),
        }),
        this.db.halloweenKnockEvent.count({
          where: winsWhere(guildId, HalloweenWinFilter.NEEDS_DELIVERY),
        }),
        this.db.halloweenGifty.count({ where: { guildId } }),
        this.db.$queryRaw<[{ count: number }]>`
          SELECT COUNT(DISTINCT "user_id")::int AS count
          FROM "halloween_knock_events"
          WHERE "guild_id" = ${guildId}
        `,
      ]);

    return {
      communityId,
      guildId,
      settings: settings && {
        startDate: settings.startDate,
        endDate: settings.endDate,
        knocksPerDay: settings.knocksPerDay,
        resetTime: settings.resetTime,
        winRate: settings.winRate,
        winChannel: settings.winChannel,
      },
      summary: {
        knocks,
        wins,
        giftiesSent,
        players: players[0].count,
        toDeliver,
      },
      prizes: await this.prizeViews(prizes),
    };
  }

  /** A page of the win feed, newest first. */
  async getWins(
    communityId: string,
    filter: HalloweenWinFilter,
    limit: number,
    offset: number,
  ): Promise<HalloweenWinPage> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) {
      return { wins: [], total: 0, hasMore: false };
    }
    const take = Math.min(Math.max(limit, 1), MAX_WINS_PAGE);
    const skip = Math.max(offset, 0);
    const where = winsWhere(guildId, filter);
    const [rows, total] = await Promise.all([
      this.db.halloweenKnockEvent.findMany({
        where,
        include: winInclude,
        orderBy: [{ time: "desc" }, { id: "desc" }],
        take,
        skip,
      }),
      this.db.halloweenKnockEvent.count({ where }),
    ]);
    return {
      wins: await this.toWins(communityId, guildId, rows),
      total,
      hasMore: skip + rows.length < total,
    };
  }

  /**
   * Marks a STAFF prize as handed over, or clears the mark. A chardb prize
   * delivers itself and cannot be marked.
   */
  async setDelivered(
    communityId: string,
    knockEventId: number,
    delivered: boolean,
    actorUserId: string,
  ): Promise<HalloweenWin> {
    const guildId = await this.guildFor(communityId);
    const knock = await this.db.halloweenKnockEvent.findUnique({
      where: { id: knockEventId },
      include: { prize: true },
    });
    if (!knock || !guildId || knock.guildId !== guildId || !knock.prize) {
      throw new NotFoundException("No such win in this community");
    }
    if (prizeDelivery(knock.prize) !== HalloweenPrizeDelivery.STAFF) {
      throw new BadRequestException(
        "This prize is a chardb item or character, which is delivered automatically",
      );
    }

    const updated = await this.db.halloweenKnockEvent.update({
      where: { id: knockEventId },
      data: delivered
        ? { deliveredAt: new Date(), deliveredById: actorUserId }
        : { deliveredAt: null, deliveredById: null },
      include: winInclude,
    });

    this.logger.log({
      event: delivered
        ? HalloweenLogEvent.PrizeMarkedDelivered
        : HalloweenLogEvent.PrizeUnmarkedDelivered,
      message: delivered
        ? "Halloween prize marked delivered"
        : "Halloween prize marked not delivered",
      communityId,
      guildId,
      knockEventId,
      prizeId: knock.prize.id,
      winnerDiscordUserId: knock.userId,
      actorUserId,
    } satisfies HalloweenLogLine);

    const [win] = await this.toWins(communityId, guildId, [updated]);
    return win;
  }

  /** Prizes as the page shows them, images resolved. */
  async prizeViews(prizes: HalloweenPrize[]): Promise<HalloweenPrizeView[]> {
    const images = await this.prizeImages.imagesFor(prizes);
    return prizes.map((p) => toPrizeView(p, images.get(p) ?? null));
  }

  /**
   * Joins in what the knock rows cannot say: DeviantArt names, linked
   * accounts, and whether those belong to the community.
   */
  private async toWins(
    communityId: string,
    guildId: string,
    rows: WinRow[],
  ): Promise<HalloweenWin[]> {
    const winnerIds = [...new Set(rows.map((r) => r.userId))];
    const [deviantArtUsers, linkedAccounts, images] = await Promise.all([
      this.db.halloweenDeviantArtUser.findMany({
        where: { guildId, userId: { in: winnerIds } },
      }),
      this.db.externalAccount.findMany({
        where: {
          provider: ExternalAccountProvider.DISCORD,
          providerAccountId: { in: winnerIds },
        },
        include: { user: { select: userMapperSelect } },
      }),
      this.prizeImages.imagesFor(
        rows.flatMap((r) => (r.prize ? [r.prize] : [])),
      ),
    ]);
    const members = await this.db.communityMember.findMany({
      where: {
        userId: { in: linkedAccounts.map((a) => a.userId) },
        role: { communityId },
      },
      select: { userId: true },
    });
    const memberIds = new Set(members.map((m) => m.userId));
    const deviantArtNames = new Map(
      deviantArtUsers.map((d) => [d.userId, d.deviantArtName]),
    );
    const linkedUsers = new Map(
      linkedAccounts.map((a) => [a.providerAccountId, a.user]),
    );

    return rows.flatMap((row) => {
      if (!row.prize) return [];
      const linked = linkedUsers.get(row.userId);
      return [
        {
          id: row.id,
          time: row.time,
          discordUserId: row.userId,
          linkedUser: linked ? mapPrismaUserToGraphQL(linked) : null,
          linkedUserIsMember: linked ? memberIds.has(linked.id) : false,
          deviantArtName: deviantArtNames.get(row.userId) ?? null,
          giftyFromDiscordUserId: row.gifties[0]?.fromUserId ?? null,
          prize: toPrizeView(row.prize, images.get(row.prize) ?? null),
          deliveredAt: row.deliveredAt,
          deliveredBy: row.deliveredBy
            ? mapPrismaUserToGraphQL(row.deliveredBy)
            : null,
        },
      ];
    });
  }
}
