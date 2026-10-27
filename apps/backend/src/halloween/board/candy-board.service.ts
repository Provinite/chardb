import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ExternalAccountProvider } from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import {
  candyPlacementsSchema,
  type CandyPlacement,
} from "./candy-board.schema";
import type { HalloweenCandy, HalloweenCandyBoard } from "./candy-board.types";

const ownerSelect = {
  ...userMapperSelect,
  externalAccounts: {
    where: { provider: ExternalAccountProvider.DISCORD },
    select: { providerAccountId: true },
  },
} as const;

/**
 * Candy boards. A board belongs to a Discord player in a guild, as knocks do,
 * and is found on chardb through the account their Discord is linked to:
 * without the link there is no telling whose candies are whose.
 */
@Injectable()
export class CandyBoardService {
  private readonly logger = new Logger(CandyBoardService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
  ) {}

  /**
   * The board of the chardb user `username`, for anyone to see. Null when
   * they do not exist, have no Discord linked, or the community has no guild.
   */
  async getBoard(
    communityId: string,
    username: string,
  ): Promise<HalloweenCandyBoard | null> {
    const guildId = await this.dashboard.guildFor(communityId);
    if (!guildId) {
      return null;
    }
    const owner = await this.db.user.findUnique({
      where: { username },
      select: ownerSelect,
    });
    const discordUserId = owner?.externalAccounts[0]?.providerAccountId;
    if (!owner || !discordUserId) {
      return null;
    }
    return this.boardOf(guildId, discordUserId, owner);
  }

  /**
   * Replaces the caller's placements. Every candy placed must be one of
   * theirs from this guild, and on the board at most once.
   */
  async saveBoard(
    communityId: string,
    userId: string,
    placements: CandyPlacement[],
  ): Promise<HalloweenCandyBoard> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const owner = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: ownerSelect,
    });
    const discordUserId = owner.externalAccounts[0]?.providerAccountId;
    if (!discordUserId) {
      throw new ForbiddenException(
        "Link your Discord account to have a candy board",
      );
    }

    const parsed = candyPlacementsSchema.safeParse(placements);
    if (!parsed.success) {
      throw new BadRequestException(
        "A candy is placed off the board or at an impossible size",
      );
    }
    const ids = parsed.data.map((p) => p.knockEventId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("A candy can only be on the board once");
    }
    const owned = await this.db.halloweenKnockEvent.count({
      where: {
        id: { in: ids },
        guildId,
        userId: discordUserId,
        candySlug: { not: null },
      },
    });
    if (owned !== ids.length) {
      throw new ForbiddenException(
        "Only your own candies can go on your board",
      );
    }

    await this.db.halloweenCandyBoard.upsert({
      where: { guildId_userId: { guildId, userId: discordUserId } },
      create: { guildId, userId: discordUserId, placements: parsed.data },
      update: { placements: parsed.data },
    });
    this.logger.log({
      event: HalloweenLogEvent.CandyBoardSaved,
      message: "Candy board saved",
      guildId,
      userId: discordUserId,
      placed: ids.length,
    } satisfies HalloweenLogLine);
    return this.boardOf(guildId, discordUserId, owner);
  }

  private async boardOf(
    guildId: string,
    discordUserId: string,
    owner: Parameters<typeof mapPrismaUserToGraphQL>[0],
  ): Promise<HalloweenCandyBoard> {
    const [knocks, board] = await Promise.all([
      this.db.halloweenKnockEvent.findMany({
        where: { guildId, userId: discordUserId, candySlug: { not: null } },
        orderBy: [{ time: "asc" }, { id: "asc" }],
        select: { id: true, candySlug: true, time: true },
      }),
      this.db.halloweenCandyBoard.findUnique({
        where: { guildId_userId: { guildId, userId: discordUserId } },
      }),
    ]);
    const candies: HalloweenCandy[] = knocks.flatMap((k) =>
      k.candySlug
        ? [{ knockEventId: k.id, slug: k.candySlug, receivedAt: k.time }]
        : [],
    );
    const held = new Set(candies.map((c) => c.knockEventId));
    return {
      owner: mapPrismaUserToGraphQL(owner),
      candies,
      // A candy whose knock is gone is dropped rather than drawn as nothing.
      placements: (board?.placements ?? []).filter((p) =>
        held.has(p.knockEventId),
      ),
    };
  }
}
