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
