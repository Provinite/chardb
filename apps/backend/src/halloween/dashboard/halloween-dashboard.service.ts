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
} from "./halloween-dashboard.types";

const winInclude = {
  prize: true,
  gifties: { select: { fromUserId: true }, take: 1 },
  deliveredBy: { select: userMapperSelect },
} satisfies Prisma.HalloweenKnockEventInclude;

type WinRow = Prisma.HalloweenKnockEventGetPayload<{
  include: typeof winInclude;
}>;

export function prizeDelivery(
  prize: Pick<HalloweenPrize, "itemTypeId" | "characterId">,
): HalloweenPrizeDelivery {
  if (prize.itemTypeId) return HalloweenPrizeDelivery.CHARDB_ITEM;
  if (prize.characterId) return HalloweenPrizeDelivery.CHARDB_CHARACTER;
  return HalloweenPrizeDelivery.STAFF;
}

function toPrizeView(prize: HalloweenPrize): HalloweenPrizeView {
  return {
    id: prize.id,
    name: prize.name,
    initialStock: prize.initialStock,
    currentStock: prize.currentStock,
    weight: prize.weight,
    image: prize.image,
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

  constructor(private readonly db: DatabaseService) {}

  /** The community's linked guild, once the event is enabled for it. */
  private async guildFor(communityId: string): Promise<string | null> {
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

  async getDashboard(communityId: string): Promise<HalloweenDashboard> {
    const guildId = await this.guildFor(communityId);
    if (!guildId) {
      return {
        communityId,
        guildId: null,
        settings: null,
        summary: { knocks: 0, wins: 0, giftiesSent: 0, players: 0 },
        prizes: [],
        wins: [],
      };
    }

    const [settings, prizes, winRows, knocks, giftiesSent, players] =
      await Promise.all([
        this.db.halloweenGuildSettings.findUnique({ where: { guildId } }),
        this.db.halloweenPrize.findMany({
          where: { guildId },
          orderBy: { id: "asc" },
        }),
        this.db.halloweenKnockEvent.findMany({
          where: { guildId, prizeId: { not: null }, isPending: false },
          include: winInclude,
          orderBy: [{ time: "desc" }, { id: "desc" }],
        }),
        this.db.halloweenKnockEvent.count({ where: { guildId } }),
        this.db.halloweenGifty.count({ where: { guildId } }),
        this.db.halloweenKnockEvent.findMany({
          where: { guildId },
          distinct: ["userId"],
          select: { userId: true },
        }),
      ]);

    const wins = await this.toWins(guildId, winRows);
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
        wins: wins.length,
        giftiesSent,
        players: players.length,
      },
      prizes: prizes.map(toPrizeView),
      wins,
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
      message: `${delivered ? "Marked" : "Unmarked"} prize ${knock.prize.id} delivered for knock ${knockEventId}`,
      communityId,
      guildId,
      knockEventId,
      prizeId: knock.prize.id,
      winnerDiscordUserId: knock.userId,
      actorUserId,
    } satisfies HalloweenLogLine);

    const [win] = await this.toWins(guildId, [updated]);
    return win;
  }

  /** Joins in what the knock rows cannot say: DeviantArt names and linked accounts. */
  private async toWins(
    guildId: string,
    rows: WinRow[],
  ): Promise<HalloweenWin[]> {
    const winnerIds = [...new Set(rows.map((r) => r.userId))];
    const [deviantArtUsers, linkedAccounts] = await Promise.all([
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
    ]);
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
          deviantArtName: deviantArtNames.get(row.userId) ?? null,
          giftyFromDiscordUserId: row.gifties[0]?.fromUserId ?? null,
          prize: toPrizeView(row.prize),
          deliveredAt: row.deliveredAt,
          deliveredBy: row.deliveredBy
            ? mapPrismaUserToGraphQL(row.deliveredBy)
            : null,
        },
      ];
    });
  }
}
