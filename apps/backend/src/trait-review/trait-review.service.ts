import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityPermission } from "../auth/CommunityPermission";
import { ModerationStatus, TraitReviewSource, Prisma } from "@prisma/client";
import { TraitReviewQueueFiltersInput } from "./dto/trait-review.dto";
import {
  traitReviewInclude,
  traitReviewQueueInclude,
} from "./utils/trait-review-mappers";

@Injectable()
export class TraitReviewService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Get the community ID for a character via species chain
   */
  private async getCharacterCommunityId(
    characterId: string,
  ): Promise<string | null> {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: {
        species: {
          select: { communityId: true },
        },
      },
    });

    return character?.species?.communityId ?? null;
  }

  /**
   * Check if user has permission to manage trait reviews for a character
   */
  private async ensureCanManageTraitReviews(
    userId: string,
    characterId: string,
  ): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) return;

    const communityId = await this.getCharacterCommunityId(characterId);
    if (!communityId) {
      throw new ForbiddenException(
        "Character is not associated with a community",
      );
    }

    const hasPermission = await this.permissionService.hasCommunityPermission(
      userId,
      communityId,
      CommunityPermission.CanEditCharacterRegistry,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to manage trait reviews",
      );
    }
  }

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

    const character = await client.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
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

    await this.ensureCanManageTraitReviews(moderatorId, review.characterId);

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId },
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
          traitValues: review.proposedTraitValues,
        },
      }),
    ]);

    return updatedReview;
  }

  /**
   * Reject a trait review
   */
  async rejectReview(reviewId: string, moderatorId: string, reason: string) {
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

    await this.ensureCanManageTraitReviews(moderatorId, review.characterId);

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId },
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
        data: { traitReviewStatus: ModerationStatus.REJECTED },
      }),
    ]);

    return updatedReview;
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

    await this.ensureCanManageTraitReviews(moderatorId, review.characterId);

    const [updatedReview] = await this.db.$transaction([
      this.db.traitReview.update({
        where: { id: reviewId },
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
