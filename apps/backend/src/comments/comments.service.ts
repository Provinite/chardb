import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
// `CommentRow` is the plain table row, aliased because `Comment` is also the
// name of the GraphQL type this service feeds.
import type { Prisma, Comment as CommentRow } from "@chardb/database";
import { NotificationKind, NotificationSubjectType } from "@chardb/database";
import { NotificationsService } from "../notifications/notifications.service";
import { notDeleted } from "../common/utils/prisma-filters";

/**
 * Service layer input types for comment operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Enum for commentable entity types (service layer equivalent)
 */
export enum CommentableTypeFilter {
  CHARACTER = "CHARACTER",
  IMAGE = "IMAGE",
  GALLERY = "GALLERY",
  USER = "USER",
}

/**
 * Input data for creating comments
 */
export interface CreateCommentServiceInput {
  /** Content of the comment */
  content: string;
  /** Type of entity being commented on */
  entityType: CommentableTypeFilter;
  /** ID of the entity being commented on */
  entityId: string;
  /** Optional parent comment ID for replies */
  parentId?: string;
}

/**
 * Input data for updating comments
 */
export interface UpdateCommentServiceInput {
  /** Updated comment content */
  content: string;
}

/**
 * Input data for filtering and paginating comment queries
 */
export interface CommentFiltersServiceInput {
  /** Filter by entity type */
  entityType?: CommentableTypeFilter;
  /** Filter by specific entity ID */
  entityId?: string;
  /** Filter by parent comment ID (null for top-level comments) */
  parentId?: string | null;
  /** Number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(authorId: string, input: CreateCommentServiceInput) {
    // Validate that the entity exists
    await this.validateEntity(input.entityType, input.entityId);

    // If this is a reply, validate the parent comment
    if (input.parentId) {
      await this.validateParentComment(
        input.parentId,
        input.entityType,
        input.entityId,
      );
    }

    const createData = this.buildCommentCreateData(
      authorId,
      input.content,
      input.entityType,
      input.entityId,
      input.parentId,
    );
    const comment = await this.databaseService.comment.create({
      data: createData,
    });

    await this.notifyOwner(authorId, comment.id, input);

    return comment;
  }

  /**
   * Tells whoever owns the commented-on thing that it was commented on.
   *
   * Deliberately outside the comment write and deliberately swallowing its own
   * failures: the comment is the thing the user asked for, and losing the
   * notification is a far better outcome than losing the comment. A reply is
   * still reported against the parent entity rather than the parent comment's
   * author, which means a thread's other participants hear nothing -- worth
   * fixing when replies get their own kind.
   */
  private async notifyOwner(
    authorId: string,
    commentId: string,
    input: CreateCommentServiceInput,
  ): Promise<void> {
    try {
      const target = await this.resolveCommentTarget(
        input.entityType,
        input.entityId,
      );
      // Commenting on your own thing is not news.
      if (!target || target.ownerId === authorId) return;

      await this.notifications.create({
        recipientId: target.ownerId,
        kind: NotificationKind.COMMENT_RECEIVED,
        actorUserId: authorId,
        subjectType: target.subjectType,
        subjectId: input.entityId,
        data: {
          subjectName: target.name.slice(0, 200),
          excerpt: input.content.slice(0, 280),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Comment ${commentId} was created but its notification was not: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** Who to tell about a comment, and what to call the thing commented on. */
  private async resolveCommentTarget(
    entityType: CommentableTypeFilter,
    entityId: string,
  ): Promise<{
    ownerId: string;
    name: string;
    subjectType: NotificationSubjectType;
  } | null> {
    switch (entityType) {
      case CommentableTypeFilter.CHARACTER: {
        const character = await this.databaseService.character.findFirst({
          where: { id: entityId, ...notDeleted },
          select: { ownerId: true, name: true },
        });
        // An orphaned character has no owner to tell.
        return character?.ownerId
          ? {
              ownerId: character.ownerId,
              name: character.name,
              subjectType: NotificationSubjectType.CHARACTER,
            }
          : null;
      }
      case CommentableTypeFilter.IMAGE: {
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
          select: { uploaderId: true, altText: true, originalFilename: true },
        });
        return image
          ? {
              ownerId: image.uploaderId,
              name: image.altText || image.originalFilename,
              subjectType: NotificationSubjectType.IMAGE,
            }
          : null;
      }
      case CommentableTypeFilter.GALLERY: {
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
          select: { ownerId: true, name: true },
        });
        return gallery
          ? {
              ownerId: gallery.ownerId,
              name: gallery.name,
              subjectType: NotificationSubjectType.GALLERY,
            }
          : null;
      }
      case CommentableTypeFilter.USER: {
        const user = await this.databaseService.user.findUnique({
          where: { id: entityId },
          select: { id: true, username: true, displayName: true },
        });
        return user
          ? {
              ownerId: user.id,
              name: user.displayName || user.username,
              subjectType: NotificationSubjectType.USER,
            }
          : null;
      }
    }
  }

  async findOne(id: string) {
    const comment = await this.databaseService.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    return comment;
  }

  async findMany(filters: CommentFiltersServiceInput) {
    const where: Prisma.CommentWhereInput = {};

    // Build where clause for entity type and ID using new structure
    if (filters.entityType && filters.entityId) {
      this.addEntityFilterToWhere(where, filters.entityType, filters.entityId);
    } else if (filters.entityType) {
      this.addEntityTypeFilterToWhere(where, filters.entityType);
    }

    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    // Don't show hidden comments
    where.isHidden = false;

    const [comments, total] = await Promise.all([
      this.databaseService.comment.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.databaseService.comment.count({ where }),
    ]);

    return {
      comments,
      hasMore: (filters.offset || 0) + (filters.limit || 20) < total,
      total,
    };
  }

  async update(id: string, authorId: string, input: UpdateCommentServiceInput) {
    const existingComment = await this.databaseService.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException("Comment not found");
    }

    if (existingComment.authorId !== authorId) {
      throw new ForbiddenException("You can only edit your own comments");
    }

    const comment = await this.databaseService.comment.update({
      where: { id },
      data: {
        content: input.content,
      },
    });

    return comment;
  }

  async remove(
    id: string,
    authorId: string,
    isAdmin: boolean = false,
  ): Promise<boolean> {
    const existingComment = await this.databaseService.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException("Comment not found");
    }

    // Check if user is the comment author or an admin
    const isAuthor = existingComment.authorId === authorId;
    if (isAuthor || isAdmin) {
      await this.databaseService.comment.delete({
        where: { id },
      });
      return true;
    }

    // Check if user owns the commentable entity
    const isCommentableOwner = await this.checkCommentableOwnership(
      existingComment,
      authorId,
    );
    if (isCommentableOwner) {
      await this.databaseService.comment.delete({
        where: { id },
      });
      return true;
    }

    throw new ForbiddenException(
      "You can only delete your own comments or comments on content you own",
    );
  }

  /**
   * Check if the user owns the entity that was commented on
   */
  private async checkCommentableOwnership(
    comment: {
      characterId: string | null;
      imageId: string | null;
      galleryId: string | null;
      userId: string | null;
    },
    userId: string,
  ): Promise<boolean> {
    // Check character ownership
    if (comment.characterId) {
      const character = await this.databaseService.character.findFirst({
        where: { id: comment.characterId, ...notDeleted },
        select: { ownerId: true },
      });
      return character?.ownerId === userId;
    }

    // Check image ownership (via uploaderId)
    if (comment.imageId) {
      const image = await this.databaseService.image.findUnique({
        where: { id: comment.imageId },
        select: { uploaderId: true },
      });
      return image?.uploaderId === userId;
    }

    // Check gallery ownership
    if (comment.galleryId) {
      const gallery = await this.databaseService.gallery.findUnique({
        where: { id: comment.galleryId },
        select: { ownerId: true },
      });
      return gallery?.ownerId === userId;
    }

    // Check user profile ownership (self)
    if (comment.userId) {
      return comment.userId === userId;
    }

    return false;
  }

  private async validateEntity(
    entityType: CommentableTypeFilter,
    entityId: string,
  ): Promise<void> {
    let exists = false;

    switch (entityType) {
      case CommentableTypeFilter.CHARACTER: {
        const character = await this.databaseService.character.findFirst({
          where: { id: entityId, ...notDeleted },
        });
        exists = !!character;
        break;
      }
      case CommentableTypeFilter.IMAGE: {
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
        });
        exists = !!image;
        break;
      }
      case CommentableTypeFilter.GALLERY: {
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
        });
        exists = !!gallery;
        break;
      }
      case CommentableTypeFilter.USER: {
        const user = await this.databaseService.user.findUnique({
          where: { id: entityId },
        });
        exists = !!user;
        break;
      }
    }

    if (!exists) {
      throw new BadRequestException(`${entityType.toLowerCase()} not found`);
    }
  }

  private async validateParentComment(
    parentId: string,
    entityType: CommentableTypeFilter,
    entityId: string,
  ): Promise<void> {
    const parentComment = await this.databaseService.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment) {
      throw new BadRequestException("Parent comment not found");
    }

    // Check if parent comment belongs to the same entity using the new structure
    const parentEntityType = this.getEntityTypeFromComment(parentComment);
    const parentEntityId = this.getEntityIdFromComment(parentComment);

    if (parentEntityType !== entityType || parentEntityId !== entityId) {
      throw new BadRequestException(
        "Parent comment must belong to the same entity",
      );
    }
  }

  private buildCommentCreateData(
    authorId: string,
    content: string,
    entityType: CommentableTypeFilter,
    entityId: string,
    parentId?: string,
  ) {
    const baseData = {
      content,
      authorId,
      parentId,
    };

    switch (entityType) {
      case CommentableTypeFilter.CHARACTER:
        return { ...baseData, characterId: entityId };
      case CommentableTypeFilter.IMAGE:
        return { ...baseData, imageId: entityId };
      case CommentableTypeFilter.GALLERY:
        return { ...baseData, galleryId: entityId };
      case CommentableTypeFilter.USER:
        return { ...baseData, userId: entityId };
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private getEntityTypeFromComment(comment: CommentRow): CommentableTypeFilter {
    if (comment.characterId) return CommentableTypeFilter.CHARACTER;
    if (comment.imageId) return CommentableTypeFilter.IMAGE;
    if (comment.galleryId) return CommentableTypeFilter.GALLERY;
    if (comment.userId) return CommentableTypeFilter.USER;
    throw new BadRequestException("Comment has no valid entity type");
  }

  private getEntityIdFromComment(comment: CommentRow): string {
    const entityId =
      comment.characterId ||
      comment.imageId ||
      comment.galleryId ||
      comment.userId;

    if (!entityId) {
      throw new BadRequestException("Comment has no valid entity reference");
    }

    return entityId;
  }

  private addEntityFilterToWhere(
    where: Prisma.CommentWhereInput,
    entityType: CommentableTypeFilter,
    entityId: string,
  ): void {
    switch (entityType) {
      case CommentableTypeFilter.CHARACTER:
        where.characterId = entityId;
        break;
      case CommentableTypeFilter.IMAGE:
        where.imageId = entityId;
        break;
      case CommentableTypeFilter.GALLERY:
        where.galleryId = entityId;
        break;
      case CommentableTypeFilter.USER:
        where.userId = entityId;
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private addEntityTypeFilterToWhere(
    where: Prisma.CommentWhereInput,
    entityType: CommentableTypeFilter,
  ): void {
    switch (entityType) {
      case CommentableTypeFilter.CHARACTER:
        where.characterId = { not: null };
        break;
      case CommentableTypeFilter.IMAGE:
        where.imageId = { not: null };
        break;
      case CommentableTypeFilter.GALLERY:
        where.galleryId = { not: null };
        break;
      case CommentableTypeFilter.USER:
        where.userId = { not: null };
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }
}
