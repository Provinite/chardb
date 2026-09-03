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
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { ItemsService } from "../items/items.service";
import { CharactersService } from "../characters/characters.service";
import { mapTraitValues } from "../characters/utils/character-resolver-mappers";
import { notDeleted } from "../common/utils/prisma-filters";
import { ChangeCharacterVariantWithItemInput } from "./dto/variant-change.dto";

/**
 * Redeeming an item to move a character between variants.
 *
 * Its own module for the same reason MyoService and EditKitsService are: it is
 * the seam between items and characters, and neither should have to import the
 * other to make it work. Nothing imports this module back.
 */
@Injectable()
export class VariantChangesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: ItemsService,
    private readonly characters: CharactersService,
  ) {}

  /**
   * Destroy an item and move the character it names to the item's variant.
   *
   * **Holding the item is the authorization.** Changing a variant is
   * otherwise staff-only -- `CharactersService.assertCanChangeVariant` refuses
   * an owner holding `canEditOwnCharacterRegistry`, deliberately, because
   * rarity is the thing these items are sold for. This is a separate mutation
   * writing through {@link CharactersService.applyVariantChange} rather than a
   * flag on `updateCharacterRegistry` so that exemption cannot leak onto the
   * staff path, whose guard is untouched.
   *
   * **This applies immediately and opens no review.** The other two
   * redemptions create one; this does not, and that is a product decision
   * rather than an oversight. A review here would have to be able to undo a
   * variant change on refusal, which means either taking back something the
   * member paid for or minting the item again -- and the community already
   * decided what this item may do when they configured the grant. If a queue
   * turns out to be wanted it is additive: a review row and a status, with
   * this transaction unchanged.
   *
   * The ordering is the one every other redemption uses. Destroy first,
   * conditionally on the member still holding the item, then move. Two
   * submitted tabs spend one item: the second destroys nothing, throws, and
   * moves nothing.
   */
  async spendItem(userId: string, input: ChangeCharacterVariantWithItemInput) {
    const { itemType, grant } = await this.items.resolveVariantChangeRedemption(
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
        traitValues: true,
      },
    });
    if (!character) {
      throw new NotFoundException("That character does not exist");
    }
    if (character.ownerId !== userId) {
      throw new BadRequestException("That character is not yours to change");
    }
    if (!character.speciesId) {
      throw new BadRequestException(
        "That character has no species, so it has no variant to change",
      );
    }

    // Already there. Its own refusal rather than folded into the coverage
    // check, because "you already are that" and "this cannot be spent on that"
    // are different things and a member who reads the wrong one goes looking
    // for the wrong problem.
    if (character.speciesVariantId === grant.toVariantId) {
      throw new BadRequestException(
        `That character is already ${grant.toVariant.name}`,
      );
    }

    if (!ItemsService.variantChangeGrantCovers(grant, character)) {
      throw new BadRequestException(
        `${itemType.name} cannot be redeemed on that character`,
      );
    }

    // Any pending review, not just a redemption's. A USER_EDIT proposal holds
    // trait values chosen for the variant the character is leaving, and
    // approving it after this had moved them would write values the new
    // variant may not allow. An MYO or import review is the same problem from
    // the other end: those traits are provisional, and moving the character
    // out from under a reviewer changes what they are looking at.
    const pending = await this.db.traitReview.count({
      where: { characterId: character.id, status: ModerationStatus.PENDING },
    });
    if (pending > 0) {
      throw new BadRequestException(
        "That character has a change awaiting review. It can be moved once " +
          "that is resolved.",
      );
    }

    const proposed = mapTraitValues(input.traitValues);

    // Validated against the **destination**, which is the entire reason this
    // input carries trait values at all. Judging them against the variant the
    // character is leaving would refuse exactly the change being paid for.
    await this.characters.validateTraitValues(
      character.speciesId,
      proposed,
      grant.toVariantId,
    );

    const previous =
      character.traitValues as PrismaJson.CharacterTraitValuesJson;

    const batchId = randomUUID();

    return this.db.$transaction(async (tx) => {
      await this.items.destroyItems(
        tx,
        [input.itemId],
        { actorUserId: userId, reason: `Redeemed ${itemType.name}` },
        {
          kind: ItemTransactionKind.USE,
          source: ItemTransactionSource.VARIANT_CHANGE_REDEMPTION,
          sourceId: character.id,
          expectedOwnerId: userId,
          batchId,
        },
      );

      return this.characters.applyVariantChange(tx, {
        characterId: character.id,
        fromVariantId: character.speciesVariantId,
        toVariantId: grant.toVariantId,
        previousTraitValues: previous,
        traitValues: proposed,
        changedById: userId,
        // The audit row says what bought the change. "Redeemed Rare Upgrade
        // Ticket" beside a staff note reading "compensation for #4412" is the
        // difference between a history and a list of mutations.
        reason: `Redeemed ${itemType.name}`,
      });
    });
  }
}
