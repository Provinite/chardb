import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import {
  ExternalAccountProvider,
  Prisma,
  type HalloweenCandyBoard as BoardRow,
} from "@chardb/database";
import { DatabaseService } from "../../database/database.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { BACKGROUND_SLUGS } from "../discord/images.generated";
import { addedCandies, applyCandyBoardActions } from "./candy-board.actions";
import {
  candyLightingSchema,
  candyPlacementsSchema,
  type CandyLighting,
  type CandyPlacement,
} from "./candy-board.schema";
import { StoredCandyBoardInvalidError } from "./candy-board.errors";
import type {
  HalloweenCandy,
  HalloweenCandyBoard,
  HalloweenCandyBoardAction,
} from "./candy-board.types";

/**
 * The most actions one save takes. The page merges what it queues, so a
 * batch is a handful; this keeps a request from holding the board's lock for
 * long. The page splits anything larger into several saves.
 */
export const MAX_ACTIONS = 100;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A board's placements, checked on the way out as on the way in: Prisma's
 * type for the column is only what this code promises it wrote.
 */
function storedPlacements(board: BoardRow): CandyPlacement[] {
  const parsed = candyPlacementsSchema.safeParse(board.placements);
  if (!parsed.success) {
    throw new StoredCandyBoardInvalidError(board.id, parsed.error.message);
  }
  return parsed.data;
}

/** A board's light, checked on the way out as on the way in. */
function storedLighting(board: BoardRow): CandyLighting | null {
  if (board.lighting === null) return null;
  const parsed = candyLightingSchema.safeParse(board.lighting);
  if (!parsed.success) {
    throw new StoredCandyBoardInvalidError(board.id, parsed.error.message);
  }
  return parsed.data;
}

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
   * Applies the signed-in player's actions to their board, skipping any that
   * cannot apply (see `applyCandyBoardActions`), and returns the board as it
   * now is. The board's row is locked while they apply, so two batches at
   * once both land.
   */
  async applyActions(
    communityId: string,
    userId: string,
    actions: HalloweenCandyBoardAction[],
  ): Promise<HalloweenCandyBoard> {
    if (actions.length > MAX_ACTIONS) {
      throw new BadRequestException(
        "Too many changes to save at once: at most 100",
      );
    }
    const guildId = await this.requireGuild(communityId);
    const discordUserId = await this.discordIdOf(userId);
    if (!discordUserId) {
      throw new ForbiddenException(
        "Link your Discord account to have a candy board",
      );
    }

    const added = addedCandies(actions);
    const owned = new Set(
      added.length
        ? (
            await this.db.halloweenKnockEvent.findMany({
              where: {
                id: { in: [...new Set(added)] },
                guildId,
                userId: discordUserId,
                candySlug: { not: null },
              },
              select: { id: true },
            })
          ).map((k) => k.id)
        : [],
    );

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
          placements: applyCandyBoardActions(
            storedPlacements(locked),
            actions,
            (knockEventId) => owned.has(knockEventId),
          ),
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

  /**
   * Sets the picture or tile behind the signed-in player's candies, or with
   * null goes back to the board's own night sky.
   */
  /**
   * Puts the light that casts the signed-in player's candies' shadows, or
   * with null goes back to the board's default light.
   */
  async setLighting(
    communityId: string,
    userId: string,
    lighting: CandyLighting | null,
  ): Promise<HalloweenCandyBoard> {
    if (lighting !== null && !candyLightingSchema.safeParse(lighting).success) {
      throw new BadRequestException(
        "The light must be over the board, at a height from 0.1 to 1, with an intensity from 0 to 1",
      );
    }
    const guildId = await this.requireGuild(communityId);
    const discordUserId = await this.discordIdOf(userId);
    if (!discordUserId) {
      throw new ForbiddenException(
        "Link your Discord account to have a candy board",
      );
    }
    // Prisma takes a JSON column's null as `Prisma.DbNull`, not null.
    const value = lighting ?? Prisma.DbNull;
    const board = await this.db.halloweenCandyBoard.upsert({
      where: { guildId_userId: { guildId, userId: discordUserId } },
      create: { guildId, userId: discordUserId, lighting: value },
      update: { lighting: value },
    });
    return this.toBoard(board, true);
  }

  async setBackground(
    communityId: string,
    userId: string,
    slug: string | null,
  ): Promise<HalloweenCandyBoard> {
    if (slug !== null && !BACKGROUND_SLUGS.includes(slug)) {
      throw new BadRequestException("There is no such background");
    }
    const guildId = await this.requireGuild(communityId);
    const discordUserId = await this.discordIdOf(userId);
    if (!discordUserId) {
      throw new ForbiddenException(
        "Link your Discord account to have a candy board",
      );
    }
    const board = await this.db.halloweenCandyBoard.upsert({
      where: { guildId_userId: { guildId, userId: discordUserId } },
      create: { guildId, userId: discordUserId, background: slug },
      update: { background: slug },
    });
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
      background: board.background,
      lighting: storedLighting(board),
      candies,
      // A candy whose knock is gone is dropped rather than drawn as nothing.
      placements: storedPlacements(board).filter((p) =>
        held.has(p.knockEventId),
      ),
    };
  }
}
