import { BadRequestException } from "@nestjs/common";

/**
 * An owner tried to give a character to its community, and it was not theirs
 * to give: it has no species, and so no community, or it was deleted or
 * changed hands since the page they acted from was loaded.
 */
export class CharacterNotGivableError extends BadRequestException {
  constructor(readonly characterId: string) {
    super("This character cannot be given to a community");
    this.name = new.target.name;
  }
}

/**
 * An owner tried to give away a character with an MYO or item-bought trait
 * change still in review. The item is already spent, and only that review's
 * outcome says whether it comes back; the character should not change hands
 * under it.
 */
export class CharacterRedemptionPendingError extends BadRequestException {
  constructor(readonly characterId: string) {
    super(
      "This character has a redemption awaiting review, so it cannot be given away until the review is decided",
    );
    this.name = new.target.name;
  }
}
