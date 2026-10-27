import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import {
  ExternalAccountProvider,
  type HalloweenCandyBoard as BoardRow,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { applyCandyBoardActions } from "./candy-board.actions";
import {
  HalloweenCandyBoardActionType,
  type HalloweenCandy,
  type HalloweenCandyBoard,
  type HalloweenCandyBoardActionInput,
} from "./candy-board.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Candy boards. A board belongs to a Discord player in a guild, as knocks do;
 * a chardb account reaches its own through the Discord account linked to it,
 * and anyone can look at one through its id.
 */
@Injectable()
export class CandyBoardService {
  private readonly logger = new Logger(CandyBoardService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly dashboard: HalloweenDashboardService,
  ) {}

  /**
   * The board with this id, if it is in this community's guild. `viewerId`
   * is whoever is asking, if signed in.
   */
  async getBoard(
    communityId: string,
    id: string,
    viewerId: string | null,
  ): Promise<HalloweenCandyBoard | null> {
    const guildId = await this.dashboard.guildFor(communityId);
    if (!guildId || !UUID.test(id)) {
      return null;
    }
    const board = await this.db.halloweenCandyBoard.findFirst({
      where: { id, guildId },
    });
    if (!board) {
      return null;
    }
    const viewerDiscordId = viewerId ? await this.discordIdOf(viewerId) : null;
    return this.toBoard(board, viewerDiscordId === board.userId);
  }

  /**
   * The signed-in player's board, made the first time it is asked for so it
   * has a link before anything is on it. Null without Discord linked.
   */
  async getMyBoard(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandyBoard | null> {
    const guildId = await this.requireGuild(communityId);
    const discordUserId = await this.discordIdOf(userId);
    if (!discordUserId) {
      return null;
    }
    const board = await this.db.halloweenCandyBoard.upsert({
      where: { guildId_userId: { guildId, userId: discordUserId } },
      create: { guildId, userId: discordUserId },
      update: {},
    });
    return this.toBoard(board, true);
  }

  /**
   * Applies the signed-in player's actions to their board, all or none. The
   * board's row is locked while they apply, so two batches at once both land.
   */
  async applyActions(
    communityId: string,
    userId: string,
    actions: HalloweenCandyBoardActionInput[],
  ): Promise<HalloweenCandyBoard> {
    const guildId = await this.requireGuild(communityId);
    const discordUserId = await this.discordIdOf(userId);
    if (!discordUserId) {
      throw new ForbiddenException(
        "Link your Discord account to have a candy board",
      );
    }

    const added = actions
      .filter((a) => a.type === HalloweenCandyBoardActionType.ADD)
      .map((a) => a.knockEventId);
    const owned = added.length
      ? await this.db.halloweenKnockEvent.count({
          where: {
            id: { in: [...new Set(added)] },
            guildId,
            userId: discordUserId,
            candySlug: { not: null },
          },
        })
      : 0;
    if (owned !== new Set(added).size) {
      throw new ForbiddenException(
        "Only your own candies can go on your board",
      );
    }

    const board = await this.db.$transaction(async (tx) => {
      const { id } = await tx.halloweenCandyBoard.upsert({
        where: { guildId_userId: { guildId, userId: discordUserId } },
        create: { guildId, userId: discordUserId },
        update: {},
        select: { id: true },
      });
      await tx.$queryRaw`SELECT 1 FROM "halloween_candy_boards" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const locked = await tx.halloweenCandyBoard.findUniqueOrThrow({
        where: { id },
      });
      return tx.halloweenCandyBoard.update({
        where: { id },
        data: {
          placements: applyCandyBoardActions(locked.placements, actions),
        },
      });
    });

    this.logger.log({
      event: HalloweenLogEvent.CandyBoardSaved,
      message: "Candy board saved",
      guildId,
      userId: discordUserId,
      boardId: board.id,
      actions: actions.length,
      placed: board.placements.length,
    } satisfies HalloweenLogLine);
    return this.toBoard(board, true);
  }

  private async requireGuild(communityId: string): Promise<string> {
    const guildId = await this.dashboard.guildFor(communityId);
    if (!guildId) {
      throw new BadRequestException(
        "This community has no Discord server linked",
      );
    }
    return guildId;
  }

  private async discordIdOf(userId: string): Promise<string | null> {
    const account = await this.db.externalAccount.findUnique({
      where: {
        provider_userId: { provider: ExternalAccountProvider.DISCORD, userId },
      },
      select: { providerAccountId: true },
    });
    return account?.providerAccountId ?? null;
  }

  private async toBoard(
    board: BoardRow,
    viewerIsOwner: boolean,
  ): Promise<HalloweenCandyBoard> {
    const [knocks, account] = await Promise.all([
      this.db.halloweenKnockEvent.findMany({
        where: {
          guildId: board.guildId,
          userId: board.userId,
          candySlug: { not: null },
        },
        orderBy: [{ time: "asc" }, { id: "asc" }],
        select: { id: true, candySlug: true, time: true },
      }),
      this.db.externalAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: ExternalAccountProvider.DISCORD,
            providerAccountId: board.userId,
          },
        },
        select: { user: { select: userMapperSelect } },
      }),
    ]);
    const candies: HalloweenCandy[] = knocks.flatMap((k) =>
      k.candySlug
        ? [{ knockEventId: k.id, slug: k.candySlug, receivedAt: k.time }]
        : [],
    );
    const held = new Set(candies.map((c) => c.knockEventId));
    return {
      id: board.id,
      owner: account ? mapPrismaUserToGraphQL(account.user) : null,
      viewerIsOwner,
      candies,
      // A candy whose knock is gone is dropped rather than drawn as nothing.
      placements: board.placements.filter((p) => held.has(p.knockEventId)),
    };
  }
}
