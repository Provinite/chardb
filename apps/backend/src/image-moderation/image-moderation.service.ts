import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PermissionService } from '../auth/PermissionService';
import { CommunityPermission } from '../auth/CommunityPermission';
import { EmailService } from '../email/email.service';
import { ModerationStatus, ModerationRejectionReason, Prisma } from '@prisma/client';
import { ImageModerationQueueFiltersInput } from './dto/image-moderation.dto';
import {
  queueImageInclude,
  moderationActionInclude,
} from './utils/image-moderation-mappers';

@Injectable()
export class ImageModerationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissionService: PermissionService,
    private readonly emailService: EmailService,
  ) {}

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
  async canUserModerateImage(userId: string, imageId: string): Promise<boolean> {
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
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
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
  async approveImage(imageId: string, moderatorId: string) {
    // Verify permission
    const canModerate = await this.canUserModerateImage(moderatorId, imageId);
    if (!canModerate) {
      throw new ForbiddenException('You do not have permission to moderate this image');
    }

    // Get the image
    const image = await this.db.image.findUnique({
      where: { id: imageId },
      include: { uploader: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.moderationStatus !== ModerationStatus.PENDING) {
      throw new BadRequestException('Image is not pending moderation');
    }

    // Update image and create action record in a transaction
    const [updatedImage, action] = await this.db.$transaction([
      this.db.image.update({
        where: { id: imageId },
        data: { moderationStatus: ModerationStatus.APPROVED },
      }),
      this.db.imageModerationAction.create({
        data: {
          imageId,
          moderatorId,
          action: ModerationStatus.APPROVED,
        },
        include: moderationActionInclude,
      }),
    ]);

    // Send notification email
    await this.sendApprovalNotification(image.uploader.email, image.uploader.username, image.originalFilename);

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
      throw new BadRequestException('Reason text is required when rejection reason is OTHER');
    }

    // Verify permission
    const canModerate = await this.canUserModerateImage(moderatorId, imageId);
    if (!canModerate) {
      throw new ForbiddenException('You do not have permission to moderate this image');
    }

    // Get the image
    const image = await this.db.image.findUnique({
      where: { id: imageId },
      include: { uploader: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (image.moderationStatus !== ModerationStatus.PENDING) {
      throw new BadRequestException('Image is not pending moderation');
    }

    // Update image and create action record in a transaction
    const [updatedImage, action] = await this.db.$transaction([
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
  private async sendApprovalNotification(email: string, username: string, imageName: string): Promise<void> {
    try {
      await this.emailService.sendImageApprovedEmail(email, username, imageName);
    } catch (error) {
      // Log but don't fail the operation
      console.error('Failed to send approval notification email:', error);
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
      await this.emailService.sendImageRejectedEmail(email, username, imageName, reason, reasonText);
    } catch (error) {
      // Log but don't fail the operation
      console.error('Failed to send rejection notification email:', error);
    }
  }
}
