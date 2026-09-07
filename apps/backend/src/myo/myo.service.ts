import { Injectable, BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import {
  ItemTransactionKind,
  ItemTransactionSource,
  TraitReviewSource,
  Visibility,
} from "@chardb/database";
import { DatabaseService } from "../database/database.service";
import { ItemsService } from "../items/items.service";
import { CharactersService } from "../characters/characters.service";
import { TagsService } from "../tags/tags.service";
import { TraitReviewService } from "../trait-review/trait-review.service";
import { mapForms } from "../characters/utils/character-resolver-mappers";
import {
  CharacterFormsService,
  DEFAULT_FORM,
} from "../character-forms/character-forms.service";
import { RedeemMyoTicketInput } from "./dto/myo.dto";

/**
 * Spending an MYO ticket.
 *
 * Its own module because it is the seam between two others: the item rules
 * live in ItemsService beside the destroy that enforces them, the character
 * rules in CharactersService, and neither should have to import the other to
 * make this work. Nothing imports this module back.
 */
@Injectable()
export class MyoService {
  constructor(
    private readonly db: DatabaseService,
    private readonly items: ItemsService,
    private readonly characters: CharactersService,
    private readonly tags: TagsService,
    private readonly traitReviews: TraitReviewService,
    private readonly forms: CharacterFormsService,
  ) {}

  /**
   * Destroy a ticket and make the character it was for.
   *
   * **Holding the ticket is the authorization.** This deliberately does not
   * require `canCreateCharacter`: a ticket that only worked for people who
   * could already create characters would be worth nothing to the members it
   * is issued to. It is a separate mutation rather than a flag on
   * `createCharacter` precisely so that exemption cannot leak onto the
   * ordinary path.
   *
   * That exemption only means something because `CharactersService.create`
   * now enforces `canCreateCharacter` itself. Its resolver decorator never
   * did -- `@AllowAnyAuthenticated` sits beside the permission and the two are
   * OR'd -- so the gate this route exists to bypass had to be built before
   * bypassing it meant anything.
   *
   * The ordering is the same one `useItem` uses and load-bearing for the same
   * reason. Destroy first, conditionally on the member still holding it, then
   * create. Two submitted tabs produce one character; the second destroys
   * nothing, throws, and creates nothing. Check-then-write here mints
   * characters.
   *
   * The character's id is generated up front rather than read back, so the
   * ledger row written by the destroy can name the character it paid for
   * without a second update.
   */
  async redeemTicket(userId: string, input: RedeemMyoTicketInput) {
    const { itemType, grant } = await this.items.resolveMyoRedemption(
      input.itemId,
      userId,
    );

    // Against the grant, not against the species. A ticket for a Common is
    // not a ticket for whatever else that species has.
    const allowed = grant.variants.some(
      (v) => v.speciesVariantId === input.speciesVariantId,
    );
    if (!allowed) {
      throw new BadRequestException(
        `${itemType.name} does not make that variant`,
      );
    }

    const forms = mapForms(input.forms) ?? [DEFAULT_FORM];
    await this.characters.validateForms(
      grant.speciesId,
      forms,
      input.speciesVariantId,
    );

    const characterId = randomUUID();
    const batchId = randomUUID();

    await this.db.$transaction(async (tx) => {
      await this.items.destroyItems(
        tx,
        [input.itemId],
        { actorUserId: userId, reason: `Redeemed ${itemType.name}` },
        {
          kind: ItemTransactionKind.USE,
          source: ItemTransactionSource.MYO_REDEMPTION,
          sourceId: characterId,
          expectedOwnerId: userId,
          batchId,
        },
      );

      await tx.character.create({
        data: {
          id: characterId,
          name: input.name,
          details: input.details,
          visibility: input.visibility ?? Visibility.PUBLIC,
          customFields: input.customFields
            ? JSON.parse(input.customFields)
            : undefined,
          owner: { connect: { id: userId } },
          creator: { connect: { id: userId } },
          species: { connect: { id: grant.speciesId } },
          speciesVariant: { connect: { id: input.speciesVariantId } },
        },
      });

      const written = await this.forms.writeForms(tx, characterId, forms);

      // Always, even when no traits were set. The review is the record that
      // this character came from a ticket and the thing a rejection hangs
      // off; a trait-less MYO still wants staff eyes on it.
      await this.traitReviews.createReview(
        characterId,
        TraitReviewSource.MYO,
        written,
        [],
        tx,
      );
    });

    // Outside the transaction, matching CharactersService.create: tags are
    // find-or-create across a shared table, and holding the redemption open
    // for them would widen the window on the part that actually matters.
    if (input.tags && input.tags.length > 0) {
      const tagModels = await this.tags.findOrCreateTags(input.tags);
      await this.db.characterTag.createMany({
        data: tagModels.map((tag) => ({ characterId, tagId: tag.id })),
        skipDuplicates: true,
      });
    }

    return this.characters.findOne(characterId, userId);
  }
}
