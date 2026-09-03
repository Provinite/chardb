import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityPermission } from "../auth/CommunityPermission";
import { EmailService } from "../email/email.service";
import {
  ModerationStatus,
  ModerationRejectionReason,
  Prisma,
  CurrencyTransactionSource,
} from "@prisma/client";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { MediaService } from "../media/media.service";
import { ImageModerationQueueFiltersInput } from "./dto/image-moderation.dto";
import {
  queueImageInclude,
  moderationActionInclude,
} from "./utils/image-moderation-mappers";

/** The optional currency reward attached to an approval. */
export interface ApproveImageAward {
  currencyId?: string | null;
  awards?: Array<{ userId: string; amount: number }>;
  staffNote?: string | null;
}

@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly permissionService: PermissionService,
    private readonly emailService: EmailService,
    private readonly currencyLedger: CurrencyLedgerService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Validate an award before any of it is applied.
   *
   * Three separate things have to hold, and checking only the first is a
   * privilege escalation rather than a missing nicety:
   *
   * 1. The caller may grant currency **in this image's community**. Moderating
   *    images and handing out prizes are separate permissions and most
   *    moderators hold only the first. The widget being hidden is a
   *    convenience, never the control.
   * 2. The currency belongs to that same community. Without this, permission
   *    is checked against the image's community while the coin is minted from
   *    whichever community the caller names -- so a moderator of a small
   *    community who is merely a *member* of a large one could mint the large
   *    one's currency to themselves. `credit()` cannot catch this: it scopes
   *    membership to the currency's own community, where the recipient is
   *    legitimately a member.
   * 3. Every recipient is actually connected to the media. A holder of
   *    canGrantItems could pay them anyway through `mintCurrency`, so this is
   *    not about privilege -- it is about the ledger row not lying. A
   *    MEDIA_APPROVAL row naming somebody with no relationship to the upload
   *    makes the source attribution worthless.
   *
   * @returns the community the image belongs to.
   */
  private async assertAwardIsValid(
    userId: string,
    imageId: string,
    mediaId: string,
    currencyId: string,
    recipientIds: string[],
  ): Promise<string> {
    const communityId = await this.getImageCommunityId(imageId);
    if (!communityId) {
      throw new BadRequestException(
        "This image does not belong to a community, so it has no currency to award",
      );
    }

    const canGrant = await this.permissionService.hasCommunityPermission(
      userId,
      communityId,
      CommunityPermission.CanGrantItems,
    );
    if (!canGrant) {
      throw new ForbiddenException(
        "You do not have permission to award currency in this community",
      );
    }

    const currency = await this.db.currency.findUnique({
      where: { id: currencyId },
      select: { communityId: true },
    });
    if (!currency || currency.communityId !== communityId) {
      throw new BadRequestException(
        "That currency does not belong to this image's community",
      );
    }

    const allowed = new Set(
      (await this.mediaService.findAwardRecipients(mediaId, communityId)).map(
        (recipient) => recipient.userId,
      ),
    );
    const strangers = recipientIds.filter((id) => !allowed.has(id));
    if (strangers.length > 0) {
      throw new BadRequestException(
        "An award can only go to someone connected to this upload",
      );
    }

    return communityId;
  }

  /**
   * Get community IDs where the user has image moderation permission
   */
  async getModeratorCommunityIds(userId: string): Promise<string[]> {
    const memberships = await this.db.communityMember.findMany({
      where: { userId },
      include: {
        role: {
          select: { communityId: true, canModerateImages: true },
        },
      },
    });

    return memberships
      .filter((m) => m.role.canModerateImages)
      .map((m) => m.role.communityId);
  }

  /**
   * Check if a user can moderate a specific image
   */
  async canUserModerateImage(
    userId: string,
    imageId: string,
  ): Promise<boolean> {
    // Check if user is a global admin
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      return true;
    }

    // Get the image's associated community (via Media -> Character -> Species -> Community)
    const communityId = await this.getImageCommunityId(imageId);

    if (!communityId) {
      // Image not associated with a community - only global admins can moderate
      return false;
    }

    // Check community permission
    return this.permissionService.hasCommunityPermission(
      userId,
      communityId,
      CommunityPermission.CanModerateImages,
    );
  }

  /**
   * Get the community ID associated with an image
   * Resolution path: Image -> Media -> Character -> Species -> Community
   */
  async getImageCommunityId(imageId: string): Promise<string | null> {
    const media = await this.db.media.findFirst({
      where: { imageId },
      select: {
        character: {
          select: {
            species: {
              select: { communityId: true },
            },
          },
        },
      },
    });

    return media?.character?.species?.communityId ?? null;
  }

  /**
   * Get pending images for a specific community's moderation queue
   */
  async getQueueForCommunity(
    communityId: string,
    filters: ImageModerationQueueFiltersInput | null,
    first: number,
    offset: number,
  ) {
    const whereClause: Prisma.ImageWhereInput = {
      moderationStatus: ModerationStatus.PENDING,
      media: {
        some: {
          character: {
            species: {
              communityId,
            },
          },
        },
      },
    };

    // Apply filters
    if (filters?.uploaderId) {
      whereClause.uploaderId = filters.uploaderId;
    }
    if (filters?.uploadedAfter || filters?.uploadedBefore) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters?.uploadedAfter) {
        dateFilter.gte = filters.uploadedAfter;
      }
      if (filters?.uploadedBefore) {
        dateFilter.lte = filters.uploadedBefore;
      }
      whereClause.createdAt = dateFilter;
    }

    const [images, total] = await Promise.all([
      this.db.image.findMany({
        where: whereClause,
        include: queueImageInclude,
        // deferred_at ASC NULLS FIRST: undeferred images keep their FIFO
        // order, deferred ones queue behind in the order they were passed on.
        orderBy: [
          { deferredAt: { sort: "asc", nulls: "first" } },
          { createdAt: "asc" },
        ],
        skip: offset,
        take: first + 1, // Fetch one extra to check hasMore
      }),
      this.db.image.count({ where: whereClause }),
    ]);

    const hasMore = images.length > first;
    const items = images.slice(0, first);

    return { items, total, hasMore };
  }

  /**
   * Get all pending images (for global admins)
   */
  async getGlobalQueue(
    filters: ImageModerationQueueFiltersInput | null,
    first: number,
    offset: number,
  ) {
    const whereClause: Prisma.ImageWhereInput = {
      moderationStatus: ModerationStatus.PENDING,
    };

    // Apply filters
    if (filters?.uploaderId) {
      whereClause.uploaderId = filters.uploaderId;
    }
    if (filters?.uploadedAfter || filters?.uploadedBefore) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters?.uploadedAfter) {
        dateFilter.gte = filters.uploadedAfter;
      }
      if (filters?.uploadedBefore) {
        dateFilter.lte = filters.uploadedBefore;
      }
      whereClause.createdAt = dateFilter;
    }

    const [images, total] = await Promise.all([
      this.db.image.findMany({
        where: whereClause,
        include: queueImageInclude,
        // deferred_at ASC NULLS FIRST: undeferred images keep their FIFO
        // order, deferred ones queue behind in the order they were passed on.
        orderBy: [
          { deferredAt: { sort: "asc", nulls: "first" } },
          { createdAt: "asc" },
        ],
        skip: offset,
        take: first + 1,
      }),
      this.db.image.count({ where: whereClause }),
    ]);

    const hasMore = images.length > first;
    const items = images.slice(0, first);

    return { items, total, hasMore };
  }

  /**
   * Approve an image
   */
  async approveImage(
    imageId: string,
    moderatorId: string,
    award?: ApproveImageAward,
  ) {
    // Verify permission
    const canModerate = await this.canUserModerateImage(moderatorId, imageId);
    if (!canModerate) {
      throw new ForbiddenException(
        "You do not have permission to moderate this image",
      );
    }

    // Get the image
    const image = await this.db.image.findUnique({
      where: { id: imageId },
      include: { uploader: true },
    });

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    if (image.moderationStatus !== ModerationStatus.PENDING) {
      throw new BadRequestException("Image is not pending moderation");
    }

    const awards = (award?.awards ?? []).filter((a) => a.amount > 0);
    // The ledger records the MEDIA, not the image. An image is an
    // implementation detail of a media: a media that has been deleted means
    // the upload is gone as far as anyone is concerned, so pointing a member's
    // statement at the surviving image would name something with no
    // user-facing existence -- and there is no route to view one either.
    let sourceMediaId: string | null = null;
    if (awards.length > 0) {
      if (!award?.currencyId) {
        throw new BadRequestException(
          "A currency is required when awarding for an approval",
        );
      }

      // findFirst, like getImageCommunityId: an image can hang off several
      // media, and the queue shows one of them. Which one is arbitrary, and
      // for a queue item there is only ever the one the moderator was looking
      // at.
      const media = await this.db.media.findFirst({
        where: { imageId },
        select: { id: true },
      });
      if (!media) {
        throw new BadRequestException(
          "This image is not attached to any media, so there is nothing to award for",
        );
      }

      // Everything the client sent is checked here, before a single row moves.
      await this.assertAwardIsValid(
        moderatorId,
        imageId,
        media.id,
        award.currencyId,
        awards.map((a) => a.userId),
      );
      sourceMediaId = media.id;
    }

    // Interactive form, not the array form: the currency credit has to run on
    // the same client so that approving and paying commit together. A member
    // paid for an approval that rolled back, or approved without the payment
    // that was promised, are both worse than the whole thing failing.
    const { action, credit } = await this.db.$transaction(async (tx) => {
      await tx.image.update({
        where: { id: imageId },
        data: { moderationStatus: ModerationStatus.APPROVED },
      });

      const created = await tx.imageModerationAction.create({
        data: {
          imageId,
          moderatorId,
          action: ModerationStatus.APPROVED,
        },
        include: moderationActionInclude,
      });

      const paid =
        awards.length > 0 && award?.currencyId
          ? await this.currencyLedger.credit({
              currencyId: award.currencyId,
              awards,
              reason: "Upload approved",
              staffNote: award.staffNote ?? null,
              actorUserId: moderatorId,
              // The moderator caused this, so the ledger names them. The
              // permission to mint came from the community, not from the
              // approval -- but "who did it" is still the moderator.
              source: CurrencyTransactionSource.MEDIA_APPROVAL,
              sourceId: sourceMediaId,
              tx,
              // Approving must not fail because an uploader has since left.
              skipNonMembers: true,
            })
          : null;

      return { action: created, credit: paid };
    });

    // Send notification email
    await this.sendApprovalNotification(
      image.uploader.email,
      image.uploader.username,
      image.originalFilename,
    );

    if (credit && credit.skipped.length > 0) {
      // Not an error -- the approval is what mattered and it succeeded -- but
      // somebody the moderator chose to pay did not get paid, so it should be
      // findable in the logs rather than only visible as an absence.
      this.logger.warn(
        `Approval of image ${imageId}: skipped currency award for ` +
          `non-members ${credit.skipped.join(", ")}`,
      );
    }

    return action;
  }

  /**
   * Reject an image
   */
  async rejectImage(
    imageId: string,
    moderatorId: string,
    reason: ModerationRejectionReason,
    reasonText?: string,
  ) {
    // Validate reasonText is provided when reason is OTHER
    if (reason === ModerationRejectionReason.OTHER && !reasonText) {
      throw new BadRequestException(
        "Reason text is required when rejection reason is OTHER",
      );
    }

    // Verify permission
    const canModerate = await this.canUserModerateImage(moderatorId, imageId);
    if (!canModerate) {
      throw new ForbiddenException(
        "You do not have permission to moderate this image",
      );
    }

    // Get the image
    const image = await this.db.image.findUnique({
      where: { id: imageId },
      include: { uploader: true },
    });

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    if (image.moderationStatus !== ModerationStatus.PENDING) {
      throw new BadRequestException("Image is not pending moderation");
    }

    // Update image and create action record in a transaction
    const [, action] = await this.db.$transaction([
      this.db.image.update({
        where: { id: imageId },
        data: { moderationStatus: ModerationStatus.REJECTED },
      }),
      this.db.imageModerationAction.create({
        data: {
          imageId,
          moderatorId,
          action: ModerationStatus.REJECTED,
          reason,
          reasonText,
        },
        include: moderationActionInclude,
      }),
    ]);

    // Send notification email
    await this.sendRejectionNotification(
      image.uploader.email,
      image.uploader.username,
      image.originalFilename,
      reason,
      reasonText,
    );

    return action;
  }

  /**
   * Send an image to the back of the moderation queue.
   *
   * No `ImageModerationAction` row is written, deliberately. That table's
   * `action` column is a `ModerationStatus`, and deferring is not one -- the
   * image is still PENDING when this returns. Recording it as a moderation
   * action would put a decision in the log that nobody made.
   */
  async deferImage(imageId: string, moderatorId: string, note?: string) {
    const canModerate = await this.canUserModerateImage(moderatorId, imageId);
    if (!canModerate) {
      throw new ForbiddenException(
        "You do not have permission to moderate this image",
      );
    }

    const image = await this.db.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    if (image.moderationStatus !== ModerationStatus.PENDING) {
      throw new BadRequestException("Image is not pending moderation");
    }

    return this.db.image.update({
      where: { id: imageId },
      data: {
        deferredAt: new Date(),
        deferredById: moderatorId,
        deferralCount: { increment: 1 },
        deferralNote: note?.trim() || null,
      },
      include: { uploader: true, artist: true, deferredBy: true },
    });
  }

  /**
   * Get pending image count for a community
   */
  async getPendingCountForCommunity(communityId: string): Promise<number> {
    return this.db.image.count({
      where: {
        moderationStatus: ModerationStatus.PENDING,
        media: {
          some: {
            character: {
              species: {
                communityId,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get global pending image count
   */
  async getGlobalPendingCount(): Promise<number> {
    return this.db.image.count({
      where: {
        moderationStatus: ModerationStatus.PENDING,
      },
    });
  }

  /**
   * Send approval notification email
   */
  private async sendApprovalNotification(
    email: string,
    username: string,
    imageName: string,
  ): Promise<void> {
    try {
      await this.emailService.sendImageApprovedEmail(
        email,
        username,
        imageName,
      );
    } catch (error) {
      // Log but don't fail the operation
      console.error("Failed to send approval notification email:", error);
    }
  }

  /**
   * Send rejection notification email
   */
  private async sendRejectionNotification(
    email: string,
    username: string,
    imageName: string,
    reason: ModerationRejectionReason,
    reasonText?: string,
  ): Promise<void> {
    try {
      await this.emailService.sendImageRejectedEmail(
        email,
        username,
        imageName,
        reason,
        reasonText,
      );
    } catch (error) {
      // Log but don't fail the operation
      console.error("Failed to send rejection notification email:", error);
    }
  }
}
