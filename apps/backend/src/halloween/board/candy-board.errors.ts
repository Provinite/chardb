import { InternalServerErrorException } from "@nestjs/common";

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
