import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import {
  ModerationStatus,
  TraitReviewSource,
  ItemTransactionKind,
  ItemTransactionSource,
  Prisma,
} from "@prisma/client";
import { ItemsService } from "../items/items.service";
import { notDeleted } from "../common/utils/prisma-filters";
import { TraitReviewQueueFiltersInput } from "./dto/trait-review.dto";
import {
  traitReviewInclude,
  traitReviewQueueInclude,
} from "./utils/trait-review-mappers";

@Injectable()
export class TraitReviewService {
  constructor(
    private readonly db: DatabaseService,
    // Only for handing a ticket back when an MYO character is refused.
    private readonly items: ItemsService,
  ) {}

  /**
   * Create a new trait review.
   * Accepts an optional transaction client to participate in an external transaction.
   */
  async createReview(
    characterId: string,
    source: TraitReviewSource,
    proposedTraitValues: PrismaJson.CharacterTraitValuesJson,
    previousTraitValues: PrismaJson.CharacterTraitValuesJson,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.db;

    const character = await client.character.findFirst({
      where: { id: characterId, ...notDeleted },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    const existingPending = await client.traitReview.findFirst({
      where: { characterId, status: ModerationStatus.PENDING },
    });

    if (existingPending) {
      throw new BadRequestException(
        "Character already has a pending trait review",
      );
    }

    const review = await client.traitReview.create({
      data: {
        characterId,
        source,
        proposedTraitValues,
        previousTraitValues,
        status: ModerationStatus.PENDING,
      },
      include: traitReviewInclude,
    });

    await client.character.update({
      where: { id: characterId },
      data: { traitReviewStatus: ModerationStatus.PENDING },
    });

    return review;
  }

  /**
   * Get paginated queue for a community
   */
  async getQueueForCommunity(
    communityId: string,
    filters: TraitReviewQueueFiltersInput | null,
    first: number,
    offset: number,
  ) {
    const whereClause: Prisma.TraitReviewWhereInput = {
      status: filters?.status ?? ModerationStatus.PENDING,
      character: {
        species: {
          communityId,
        },
      },
    };

    if (filters?.source) {
      whereClause.source = filters.source;
    }

    const [items, total] = await Promise.all([
      this.db.traitReview.findMany({
        where: whereClause,
        include: traitReviewQueueInclude,
        orderBy: { createdAt: "asc" },
        skip: offset,
        take: first + 1,
      }),
      this.db.traitReview.count({ where: whereClause }),
    ]);

    const hasMore = items.length > first;
    const trimmedItems = items.slice(0, first);

    return { items: trimmedItems, total, hasMore };
  }

  /**
   * Approve a trait review - applies the proposed trait values to the character
   */
  async approveReview(reviewId: string, moderatorId: string) {
    const review = await this.db.traitReview.findUnique({
      where: { id: reviewId },
      include: traitReviewInclude,
    });

    if (!review) {
      throw new NotFoundException("Trait review not found");
    }

    if (review.status !== ModerationStatus.PENDING) {
      throw new BadRequestException("Review is not pending");
    }

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.APPROVED,
          resolvedAt: new Date(),
          resolvedById: moderatorId,
        },
        include: traitReviewInclude,
      }),
      this.db.character.update({
        where: { id: review.characterId },
        data: {
          traitReviewStatus: ModerationStatus.APPROVED,
        },
      }),
    ]);

    if (review.source === TraitReviewSource.MYO) {
      await this.assignRegistryId(review.characterId);
    }

    return updatedReview;
  }

  /**
   * Give an approved MYO character the next number in its species.
   *
   * MYO only, deliberately. Every other character is created by somebody with
   * the registry permission, who types the number they meant; taking that over
   * would change behaviour nobody asked to change. An MYO character is created
   * by a member who is not allowed to pick one, so it arrives with none.
   *
   * The scheme reads the corpus rather than imposing one: the highest purely
   * numeric registry id in this species, plus one, zero-padded to the widest
   * width already in use. Species whose ids are not numbers get nothing, which
   * is the honest answer -- guessing a format from `PIL-0091-b` would produce
   * a number that looks official and is not.
   *
   * After the approval commits, not inside it. `[speciesId, registryId]` is
   * unique, so two approvals racing means one loses; a loser inside the
   * approval transaction would roll back an approval that was otherwise fine.
   * Out here it just retries. Exhausting the retries leaves the id null, which
   * is exactly where every character stood before this ran -- staff assign by
   * hand, as they do today.
   */
  private async assignRegistryId(characterId: string, attempts = 5) {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: { speciesId: true, registryId: true },
    });
    if (!character?.speciesId || character.registryId) return;

    const existing = await this.db.character.findMany({
      where: { speciesId: character.speciesId, registryId: { not: null } },
      select: { registryId: true },
    });

    const numeric = existing
      .map((c) => c.registryId!)
      .filter((id) => /^\d+$/.test(id));

    const width = Math.max(4, ...numeric.map((id) => id.length));
    let next = numeric.reduce((max, id) => Math.max(max, Number(id)), 0) + 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        await this.db.character.update({
          where: { id: characterId },
          data: { registryId: String(next).padStart(width, "0") },
        });
        return;
      } catch (err) {
        // P2002 is the unique violation on [speciesId, registryId]: somebody
        // else took this number between the read and the write. Anything else
        // is not ours to swallow.
        if (
          !(err instanceof Prisma.PrismaClientKnownRequestError) ||
          err.code !== "P2002"
        ) {
          throw err;
        }
        next += 1;
      }
    }
  }

  /**
   * Revert a trait review - restores the character's previous trait values.
   * Cannot revert CREATION or IMPORT-source reviews since there are no previous values.
   *
   * An MYO review has no previous values either, but reverting one is not
   * meaningless -- it undoes the whole redemption. See
   * {@link reverseMyoRedemption}.
   */
  async revertReview(reviewId: string, moderatorId: string, reason: string) {
    const review = await this.db.traitReview.findUnique({
      where: { id: reviewId },
      include: traitReviewInclude,
    });

    if (!review) {
      throw new NotFoundException("Trait review not found");
    }

    if (review.status !== ModerationStatus.PENDING) {
      throw new BadRequestException("Review is not pending");
    }

    if (
      review.source === TraitReviewSource.CREATION ||
      review.source === TraitReviewSource.IMPORT
    ) {
      throw new BadRequestException(
        `Cannot revert a ${review.source} review - there are no previous trait values to restore`,
      );
    }

    if (review.source === TraitReviewSource.MYO) {
      return this.rejectMyoReview(review.id, review.characterId, {
        moderatorId,
        reason,
      });
    }

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.REJECTED,
          resolvedAt: new Date(),
          resolvedById: moderatorId,
          rejectionReason: reason,
        },
        include: traitReviewInclude,
      }),
      this.db.character.update({
        where: { id: review.characterId },
        data: {
          traitReviewStatus: ModerationStatus.REJECTED,
          traitValues: review.previousTraitValues,
        },
      }),
    ]);

    return updatedReview;
  }

  /**
   * Refuse an MYO character: the character goes, the ticket comes back.
   *
   * Reverting the trait values, which is what rejection means everywhere
   * else, would leave the member holding a character with no traits and no
   * ticket -- the worst of both. An MYO redemption is one act, so refusing it
   * undoes the whole act.
   *
   * **Returning a ticket is a mint**, and this is the only path to it. Two
   * things keep it once-only, both inside one transaction:
   *
   * - The review update carries `status: PENDING` in its own WHERE, so a
   *   second rejection updates no rows and the transaction rolls back before
   *   anything is granted.
   * - It is unreachable except from a PENDING MYO review, checked above.
   *
   * The ticket handed back is a **new item**, not the original resurrected.
   * The original was destroyed and its history says so; un-destroying it would
   * make the ledger lie about an item that really was spent. The two are tied
   * together by the ledger instead: the USE row names this character, and the
   * GRANT row names this review.
   */
  private async rejectMyoReview(
    reviewId: string,
    characterId: string,
    context: { moderatorId: string; reason: string },
  ) {
    // Which type to give back, read from the ledger rather than a column on
    // the character. The USE row written by the redemption already names the
    // item type, and `[source, sourceId]` is indexed.
    const redemption = await this.db.itemTransaction.findFirst({
      where: {
        source: ItemTransactionSource.MYO_REDEMPTION,
        sourceId: characterId,
        kind: ItemTransactionKind.USE,
      },
      select: {
        itemTypeId: true,
        communityId: true,
        fromUserId: true,
      },
    });

    return this.db.$transaction(async (tx) => {
      // PENDING in the WHERE, not trusted from the read above. A second
      // rejection landing concurrently updates nothing, which throws, which
      // rolls back the grant below.
      const updatedReview = await tx.traitReview.update({
        where: { id: reviewId, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.REJECTED,
          resolvedAt: new Date(),
          resolvedById: context.moderatorId,
          rejectionReason: context.reason,
        },
        include: traitReviewInclude,
      });

      const character = await tx.character.update({
        where: { id: characterId },
        data: {
          traitReviewStatus: ModerationStatus.REJECTED,
          deletedAt: new Date(),
          deletedById: context.moderatorId,
        },
        select: { ownerId: true },
      });

      // No redemption row means this character was not made from a ticket --
      // only reachable if a review's source were edited by hand. The
      // character still goes; inventing an item to hand back on a guess would
      // be worse than handing back nothing.
      //
      // Back to whoever holds the character now rather than whoever spent the
      // ticket, falling back to the spender when it has been orphaned. A
      // traded-away MYO has no clean answer, and the current owner is the one
      // losing the character.
      const recipientId = character.ownerId ?? redemption?.fromUserId;
      if (redemption && recipientId) {
        await this.items.createGranted(tx, {
          itemTypeId: redemption.itemTypeId,
          communityId: redemption.communityId,
          ownerId: recipientId,
          quantity: 1,
          actor: {
            actorUserId: context.moderatorId,
            reason: "Returned after the character made with it was refused",
          },
          source: ItemTransactionSource.MYO_REJECTION,
          sourceId: reviewId,
        });
      }

      return updatedReview;
    });
  }

  /**
   * Edit and approve a trait review - applies corrected trait values
   */
  async editAndApproveReview(
    reviewId: string,
    moderatorId: string,
    correctedTraitValues: PrismaJson.CharacterTraitValuesJson,
  ) {
    const review = await this.db.traitReview.findUnique({
      where: { id: reviewId },
      include: traitReviewInclude,
    });

    if (!review) {
      throw new NotFoundException("Trait review not found");
    }

    if (review.status !== ModerationStatus.PENDING) {
      throw new BadRequestException("Review is not pending");
    }

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId, status: ModerationStatus.PENDING },
        data: {
          status: ModerationStatus.APPROVED,
          resolvedAt: new Date(),
          resolvedById: moderatorId,
          appliedTraitValues: correctedTraitValues,
        },
        include: traitReviewInclude,
      }),
      this.db.character.update({
        where: { id: review.characterId },
        data: {
          traitReviewStatus: ModerationStatus.APPROVED,
          traitValues: correctedTraitValues,
        },
      }),
    ]);

    // Correcting an MYO's traits and approving it is still approving it, so
    // it gets its number the same way.
    if (review.source === TraitReviewSource.MYO) {
      await this.assignRegistryId(review.characterId);
    }

    return updatedReview;
  }

  /**
   * Get the active (PENDING) review for a character
   */
  async getActiveReviewForCharacter(characterId: string) {
    return this.db.traitReview.findFirst({
      where: {
        characterId,
        status: ModerationStatus.PENDING,
      },
      orderBy: { createdAt: "desc" },
      include: traitReviewInclude,
    });
  }

  /**
   * Get pending review count for a community
   */
  async getPendingCountForCommunity(communityId: string): Promise<number> {
    return this.db.traitReview.count({
      where: {
        status: ModerationStatus.PENDING,
        character: {
          species: {
            communityId,
          },
        },
      },
    });
  }
}
