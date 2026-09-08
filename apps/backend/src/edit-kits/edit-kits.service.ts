import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  ItemTransactionKind,
  ItemTransactionSource,
  ModerationStatus,
  TraitReviewSource,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { ItemsService } from "../items/items.service";
import { CharactersService } from "../characters/characters.service";
import { TraitReviewService } from "../trait-review/trait-review.service";
import { mapFormsChange } from "../characters/utils/character-resolver-mappers";
import {
  CharacterFormsService,
  sameForms,
  writesToSnapshot,
} from "../character-forms/character-forms.service";
import { notDeleted } from "../common/utils/prisma-filters";
import { EditCharacterTraitsWithKitInput } from "./dto/edit-kit.dto";

/**
 * Spending an edit kit on a character's traits.
 *
 * Its own module for the same reason MyoService is one: it is the seam between
 * items and characters, and neither should have to import the other to make it
 * work. Nothing imports this module back.
 */
@Injectable()
export class EditKitsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: ItemsService,
    private readonly characters: CharactersService,
    private readonly traitReviews: TraitReviewService,
    private readonly forms: CharacterFormsService,
  ) {}

  /**
   * Destroy a kit and propose a change to a character's traits.
   *
   * **Holding the kit is the authorization.** The stock Member role does not
   * carry `canEditOwnCharacterRegistry`, so an ordinary member cannot change
   * their own character's traits at all -- the kit is the only self-service
   * route there is. It is a separate mutation rather than a flag on
   * `updateCharacterRegistry` precisely so that exemption cannot leak onto the
   * ordinary path, whose guard is untouched.
   *
   * **Nothing is applied here.** Unlike every other trait review in the
   * codebase, an edit kit's proposal lives only in the review row until staff
   * approve it. Applying first and reverting on refusal would have a member
   * wearing an unapproved trait for as long as the queue is backed up, and
   * then losing it in public. `TraitReviewService.approveReview` is what
   * writes the values.
   *
   * The submission is the character's whole form list, so a kit is also how a
   * member adds a second form to a character whose variant allows one -- the
   * proposal and the review are the same as for any other trait change, which
   * is the point. A form added this way exists nowhere until staff approve it.
   *
   * The ordering is the one `useItem` and MYO redemption use, for the same
   * reason. Destroy first, conditionally on the member still holding the kit,
   * then write the review. Two submitted tabs spend one kit: the second
   * destroys nothing, throws, and proposes nothing.
   *
   * The one-pending-review rule is enforced twice on purpose. `createReview`
   * checks it, which produces a readable message; a partial unique index on
   * `trait_reviews` enforces it, which is what actually holds when two
   * requests race. The check alone is a read before a write.
   */
  async spendKit(userId: string, input: EditCharacterTraitsWithKitInput) {
    const { itemType, grant } = await this.items.resolveTraitEditRedemption(
      input.itemId,
      userId,
    );

    const character = await this.db.character.findFirst({
      where: { id: input.characterId, ...notDeleted },
      select: {
        id: true,
        ownerId: true,
        speciesId: true,
        speciesVariantId: true,
      },
    });
    if (!character) {
      throw new NotFoundException("That character does not exist");
    }
    if (character.ownerId !== userId) {
      throw new BadRequestException("That character is not yours to edit");
    }
    if (!character.speciesId) {
      throw new BadRequestException(
        "That character has no species, so it has no traits to change",
      );
    }

    if (!ItemsService.traitEditGrantCovers(grant, character)) {
      throw new BadRequestException(
        `${itemType.name} cannot be used on that character`,
      );
    }

    const proposedWrites = await this.forms.plan(
      character.id,
      mapFormsChange(input.forms) ?? {},
    );
    await this.forms.validateForms(
      character.speciesId,
      proposedWrites,
      character.speciesVariantId,
    );

    const previous = await this.forms.readForms(character.id);
    const proposed = writesToSnapshot(proposedWrites);

    // Spending a kit to change nothing is the one refusal a member is most
    // likely to hit by accident -- opening the editor, thinking better of it,
    // and submitting anyway. Cheaper to refuse than to explain afterwards.
    if (sameForms(previous, proposed)) {
      throw new BadRequestException(
        "That would change nothing, so the kit has not been spent",
      );
    }

    // Checked before the destroy as well as being enforced by the index, so
    // the ordinary case gets a sentence rather than a constraint violation.
    const pending = await this.db.traitReview.count({
      where: { characterId: character.id, status: ModerationStatus.PENDING },
    });
    if (pending > 0) {
      throw new BadRequestException(
        "That character already has a change awaiting review",
      );
    }

    const batchId = randomUUID();

    return this.db.$transaction(async (tx) => {
      await this.items.destroyItems(
        tx,
        [input.itemId],
        { actorUserId: userId, reason: `Redeemed ${itemType.name}` },
        {
          kind: ItemTransactionKind.USE,
          source: ItemTransactionSource.TRAIT_EDIT_REDEMPTION,
          sourceId: character.id,
          expectedOwnerId: userId,
          batchId,
        },
      );

      // The character is deliberately not touched. `createReview` marks it
      // PENDING and nothing else; the traits on it stay the approved ones
      // until somebody signs this off.
      return this.traitReviews.createReview(
        character.id,
        TraitReviewSource.USER_EDIT,
        proposed,
        previous,
        tx,
      );
    });
  }
}
