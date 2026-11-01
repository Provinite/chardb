import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type HalloweenCandyBoard as BoardRow } from "@chardb/database";
import { isUuid } from "../uuid";
import { DatabaseService } from "../../database/database.service";
import {
  mapPrismaUserToGraphQL,
  userMapperSelect,
} from "../../users/utils/user-resolver-mappers";
import { HalloweenDashboardService } from "../dashboard/halloween-dashboard.service";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { CANDY_BOARD_LIMIT } from "@chardb/shared";
import { BACKGROUND_SLUGS } from "../discord/images.generated";
import { addedCandies, applyCandyBoardActions } from "./candy-board.actions";
import {
  candyBackgroundEffectsSchema,
  candyLightingSchema,
  candyPlacementsSchema,
  isNameplate,
  type CandyBackgroundEffects,
  type CandyLighting,
  type CandyPlacement,
} from "./candy-board.schema";
import {
  StoredCandyBoardInvalidError,
  orBoardGone,
} from "./candy-board.errors";
import {
  boardNameSchema,
  storedBoardNameSchema,
  type BoardName,
} from "./board-names";
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

/**
 * A board's placements, checked on the way out as on the way in: Prisma's
 * type for the column is only what this code promises it wrote.
 */
function storedPlacements(board: {
  id: string;
  placements: unknown;
}): CandyPlacement[] {
  const parsed = candyPlacementsSchema.safeParse(board.placements);
  if (!parsed.success) {
    throw new StoredCandyBoardInvalidError(board.id, parsed.error.message);
  }
  return parsed.data;
}

/** The candies stuck on a player's boards in a guild, by id. */
export async function candiesOnBoards(
  tx: Prisma.TransactionClient,
  guildId: string,
  ownerId: string,
): Promise<Set<number>> {
  const boards = await tx.halloweenCandyBoard.findMany({
    where: { guildId, ownerId },
    select: { id: true, placements: true },
  });
  return new Set(
    boards.flatMap((b) =>
      storedPlacements(b).flatMap((p) =>
        isNameplate(p.sticker) ? [] : [p.sticker.candy],
      ),
    ),
  );
}

/**
 * Takes candies off their former owners' boards in a guild, for when they
 * change hands: `lost` maps each former owner to the candies they no longer
 * have. Every board is locked while it changes, as a save locks it, so a save
 * at the same time cannot put them back. All are locked in one query in one
 * order, so two trades between the same players cannot deadlock.
 */
export async function removeCandiesFromBoards(
  tx: Prisma.TransactionClient,
  guildId: string,
  lost: Map<string, number[]>,
): Promise<void> {
  if (!lost.size) return;
  const boards = await tx.$queryRaw<
    { id: string; owner_id: string; placements: Prisma.JsonValue }[]
  >`
    SELECT "id", "owner_id", "placements" FROM "halloween_candy_boards"
    WHERE "guild_id" = ${guildId} AND "owner_id" IN (${Prisma.join([...lost.keys()])})
    ORDER BY "id"
    FOR UPDATE
  `;
  for (const { id, owner_id: ownerId, placements: stored } of boards) {
    const gone = new Set(lost.get(ownerId));
    const placements = storedPlacements({ id, placements: stored });
    const kept = placements.filter(
      (p) => isNameplate(p.sticker) || !gone.has(p.sticker.candy),
    );
    if (kept.length !== placements.length) {
      await tx.halloweenCandyBoard.update({
        where: { id },
        data: { placements: kept },
      });
    }
  }
}

/** How a board's background is muted, checked on the way out as on the way in. */
function storedBackgroundEffects(
  board: BoardRow,
): CandyBackgroundEffects | null {
  if (board.backgroundEffects === null) return null;
  const parsed = candyBackgroundEffectsSchema.safeParse(
    board.backgroundEffects,
  );
  if (!parsed.success) {
    throw new StoredCandyBoardInvalidError(board.id, parsed.error.message);
  }
  return parsed.data;
}

/** A board's name, checked for shape on the way out. */
function storedName(board: BoardRow): BoardName | null {
  if (board.name === null) return null;
  const parsed = storedBoardNameSchema.safeParse(board.name);
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
 * Candy boards. A board belongs to a chardb user in a guild, and draws on the
 * candies they own there; anyone can look at one through its id.
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
    if (!guildId || !isUuid(id)) {
      return null;
    }
    const board = await this.db.halloweenCandyBoard.findFirst({
      where: { id, guildId },
    });
    if (!board) {
      return null;
    }
    return this.toBoard(board, viewerId === board.ownerId);
  }

  /** The signed-in player's boards here, the last changed first. */
  async getMyBoards(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandyBoard[]> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const boards = await this.db.halloweenCandyBoard.findMany({
      where: { guildId, ownerId: userId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    // One player's: their candies and name are fetched once for them all.
    const owner = await this.ownerOf(guildId, userId);
    return boards.map((board) => this.present(board, true, owner));
  }

  /**
   * A new, empty board for the signed-in player; at most CANDY_BOARD_LIMIT
   * each.
   */
  async createBoard(
    communityId: string,
    userId: string,
  ): Promise<HalloweenCandyBoard> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const board = await this.db.$transaction(async (tx) => {
      const count = await tx.halloweenCandyBoard.count({
        where: { guildId, ownerId: userId },
      });
      if (count >= CANDY_BOARD_LIMIT) {
        throw new BadRequestException(
          `You can have at most ${CANDY_BOARD_LIMIT} candy boards`,
        );
      }
      return tx.halloweenCandyBoard.create({
        data: { guildId, ownerId: userId },
      });
    });
    this.logger.log({
      event: HalloweenLogEvent.CandyBoardCreated,
      message: "Candy board created",
      guildId,
      userId,
      boardId: board.id,
    } satisfies HalloweenLogLine);
    return this.toBoard(board, true);
  }

  /** Deletes one of the signed-in player's boards, for good. */
  async deleteBoard(
    communityId: string,
    userId: string,
    id: string,
  ): Promise<boolean> {
    const board = await this.myBoard(communityId, userId, id);
    await orBoardGone(
      board.id,
      this.db.halloweenCandyBoard.delete({ where: { id: board.id } }),
    );
    this.logger.log({
      event: HalloweenLogEvent.CandyBoardDeleted,
      message: "Candy board deleted",
      guildId: board.guildId,
      userId: board.ownerId,
      boardId: board.id,
    } satisfies HalloweenLogLine);
    return true;
  }

  /**
   * Applies the signed-in player's actions to one of their boards, skipping
   * any that cannot apply (see `applyCandyBoardActions`), and returns the
   * board as it now is. The board's row is locked while they apply, so two
   * batches at once both land.
   */
  async applyActions(
    communityId: string,
    userId: string,
    id: string,
    actions: HalloweenCandyBoardAction[],
  ): Promise<HalloweenCandyBoard> {
    if (actions.length > MAX_ACTIONS) {
      throw new BadRequestException(
        "Too many changes to save at once: at most 100",
      );
    }
    const { guildId } = await this.myBoard(communityId, userId, id);
    const added = addedCandies(actions);

    const board = await orBoardGone(
      id,
      this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "halloween_candy_boards" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const locked = await tx.halloweenCandyBoard.findUniqueOrThrow({
          where: { id },
        });
        // Checked under the board's lock, which a trade also takes to take
        // its candies off: a candy traded away meanwhile is not put back.
        const owned = new Set(
          added.length
            ? (
                await tx.halloweenCandy.findMany({
                  where: {
                    id: { in: [...new Set(added)] },
                    guildId,
                    ownerId: userId,
                    offerId: null,
                  },
                  select: { id: true },
                })
              ).map((k) => k.id)
            : [],
        );
        return tx.halloweenCandyBoard.update({
          where: { id },
          data: {
            placements: applyCandyBoardActions(
              storedPlacements(locked),
              actions,
              (sticker) =>
                isNameplate(sticker)
                  ? locked.name !== null
                  : owned.has(sticker.candy),
            ),
          },
        });
      }),
    );

    this.logger.log({
      event: HalloweenLogEvent.CandyBoardSaved,
      message: "Candy board saved",
      guildId,
      userId,
      boardId: board.id,
      actions: actions.length,
      placed: board.placements.length,
    } satisfies HalloweenLogLine);
    return this.toBoard(board, true);
  }

  /**
   * Names one of the signed-in player's boards from the word lists, or with
   * null leaves it unnamed.
   */
  async setName(
    communityId: string,
    userId: string,
    id: string,
    name: BoardName | null,
  ): Promise<HalloweenCandyBoard> {
    if (name !== null && !boardNameSchema.safeParse(name).success) {
      throw new BadRequestException(
        "A board's name is a first and a last word, and any joiner, from their lists",
      );
    }
    await this.myBoard(communityId, userId, id);
    const board = await orBoardGone(
      id,
      this.db.halloweenCandyBoard.update({
        where: { id },
        data: { name: name ?? Prisma.DbNull },
      }),
    );
    return this.toBoard(board, true);
  }

  /**
   * Puts the light that casts the shadows on one of the signed-in player's
   * boards, or with null goes back to the board's default light.
   */
  async setLighting(
    communityId: string,
    userId: string,
    id: string,
    lighting: CandyLighting | null,
  ): Promise<HalloweenCandyBoard> {
    if (lighting !== null && !candyLightingSchema.safeParse(lighting).success) {
      throw new BadRequestException(
        "The light must be over the board, at a height from 0.1 to 1, with an intensity from 0 to 1, coloured #rrggbb at a strength from 0 to 1, and a spotlight and cone from 0 to 1",
      );
    }
    await this.myBoard(communityId, userId, id);
    const board = await orBoardGone(
      id,
      this.db.halloweenCandyBoard.update({
        where: { id },
        // Prisma takes a JSON column's null as `Prisma.DbNull`, not null.
        data: { lighting: lighting ?? Prisma.DbNull },
      }),
    );
    return this.toBoard(board, true);
  }

  /**
   * Puts the picture or tile behind the candies on one of the signed-in
   * player's boards, null for none chosen, and how it is dimmed and tinted;
   * null effects for neither.
   */
  async setBackground(
    communityId: string,
    userId: string,
    id: string,
    slug: string | null,
    effects: CandyBackgroundEffects | null = null,
  ): Promise<HalloweenCandyBoard> {
    if (slug !== null && !BACKGROUND_SLUGS.includes(slug)) {
      throw new BadRequestException("There is no such background");
    }
    if (
      effects !== null &&
      !candyBackgroundEffectsSchema.safeParse(effects).success
    ) {
      throw new BadRequestException(
        "The background can be dimmed by up to 0.8, tinted a #rrggbb colour at a strength from 0 to 1, and saturated from 0 to 1",
      );
    }
    await this.myBoard(communityId, userId, id);
    const board = await orBoardGone(
      id,
      this.db.halloweenCandyBoard.update({
        where: { id },
        data: { background: slug, backgroundEffects: effects ?? Prisma.DbNull },
      }),
    );
    return this.toBoard(board, true);
  }

  /**
   * One of the signed-in player's boards, to change: refused for a board
   * that is not theirs here, or not at all.
   */
  private async myBoard(
    communityId: string,
    userId: string,
    id: string,
  ): Promise<BoardRow> {
    const guildId = await this.dashboard.linkedGuildFor(communityId);
    const board = isUuid(id)
      ? await this.db.halloweenCandyBoard.findFirst({
          where: { id, guildId, ownerId: userId },
        })
      : null;
    if (!board) {
      throw new NotFoundException("There is no such candy board of yours");
    }
    return board;
  }

  private async toBoard(
    board: BoardRow,
    viewerIsOwner: boolean,
  ): Promise<HalloweenCandyBoard> {
    return this.present(
      board,
      viewerIsOwner,
      await this.ownerOf(board.guildId, board.ownerId),
    );
  }

  /**
   * A board's owner, as their boards show them: who, and their candies here
   * that are not held in an offer.
   */
  private async ownerOf(guildId: string, ownerId: string) {
    const [candies, user] = await Promise.all([
      this.db.halloweenCandy.findMany({
        where: { guildId, ownerId, offerId: null },
        orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
        select: { id: true, slug: true, receivedAt: true },
      }),
      this.db.user.findUnique({
        where: { id: ownerId },
        select: userMapperSelect,
      }),
    ]);
    return {
      candies: candies satisfies HalloweenCandy[],
      user: user ? mapPrismaUserToGraphQL(user) : null,
    };
  }

  private present(
    board: BoardRow,
    viewerIsOwner: boolean,
    { candies, user }: Awaited<ReturnType<CandyBoardService["ownerOf"]>>,
  ): HalloweenCandyBoard {
    const held = new Set(candies.map((c) => c.id));
    return {
      id: board.id,
      owner: user,
      viewerIsOwner,
      background: board.background,
      backgroundEffects: storedBackgroundEffects(board),
      lighting: storedLighting(board),
      name: storedName(board),
      candies,
      // A candy traded away or held in an offer is dropped rather than drawn
      // as nothing; the nameplate waits, where it was, while the board has
      // no name.
      placements: storedPlacements(board).filter((p) =>
        isNameplate(p.sticker)
          ? board.name !== null
          : held.has(p.sticker.candy),
      ),
    };
  }
}
