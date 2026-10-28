import {
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@chardb/database";

/**
 * A board was deleted -- in another tab, say -- between a change to it being
 * checked and being written.
 */
export class CandyBoardGoneError extends NotFoundException {
  constructor(readonly boardId: string) {
    super("This candy board was deleted, so the change could not be saved");
    this.name = new.target.name;
  }
}

/**
 * A write to a board, with the board having gone since it was checked told
 * as that, rather than as Prisma's "record not found" (P2025).
 */
export async function orBoardGone<T>(
  boardId: string,
  write: Promise<T>,
): Promise<T> {
  try {
    return await write;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new CandyBoardGoneError(boardId);
    }
    throw error;
  }
}

/**
 * A board's stored placements are not what `candyPlacementsSchema` says they
 * are. Every write is parsed first, so this means a row written some other
 * way -- by hand, or by code from before a schema change.
 */
export class StoredCandyBoardInvalidError extends InternalServerErrorException {
  constructor(
    readonly boardId: string,
    readonly issues: string,
  ) {
    super("A stored candy board is not in the expected shape");
    this.name = new.target.name;
  }
}
