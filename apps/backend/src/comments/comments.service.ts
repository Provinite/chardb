import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { Prisma } from "@chardb/database";

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
  constructor(private readonly databaseService: DatabaseService) {}

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

    return comment;
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
      const character = await this.databaseService.character.findUnique({
        where: { id: comment.characterId },
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
      case CommentableTypeFilter.CHARACTER:
        const character = await this.databaseService.character.findUnique({
          where: { id: entityId },
        });
        exists = !!character;
        break;
      case CommentableTypeFilter.IMAGE:
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
        });
        exists = !!image;
        break;
      case CommentableTypeFilter.GALLERY:
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
        });
        exists = !!gallery;
        break;
      case CommentableTypeFilter.USER:
        const user = await this.databaseService.user.findUnique({
          where: { id: entityId },
        });
        exists = !!user;
        break;
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

  private getEntityTypeFromComment(
    comment: Prisma.CommentGetPayload<{}>,
  ): CommentableTypeFilter {
    if (comment.characterId) return CommentableTypeFilter.CHARACTER;
    if (comment.imageId) return CommentableTypeFilter.IMAGE;
    if (comment.galleryId) return CommentableTypeFilter.GALLERY;
    if (comment.userId) return CommentableTypeFilter.USER;
    throw new BadRequestException("Comment has no valid entity type");
  }

  private getEntityIdFromComment(
    comment: Prisma.CommentGetPayload<{}>,
  ): string {
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
