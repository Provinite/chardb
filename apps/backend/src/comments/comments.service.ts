import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCommentInput, UpdateCommentInput, CommentFiltersInput, CommentableType } from './dto/comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(authorId: string, input: CreateCommentInput): Promise<Comment> {
    // Validate that the entity exists
    await this.validateEntity(input.entityType, input.entityId);

    // If this is a reply, validate the parent comment
    if (input.parentId) {
      await this.validateParentComment(input.parentId, input.entityType, input.entityId);
    }

    const createData = this.buildCommentCreateData(authorId, input.content, input.entityType, input.entityId, input.parentId);
    const comment = await this.databaseService.comment.create({
      data: createData,
      include: {
        author: true,
        parent: {
          include: {
            author: true,
          },
        },
        replies: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this.mapToCommentEntity(comment);
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.databaseService.comment.findUnique({
      where: { id },
      include: {
        author: true,
        parent: {
          include: {
            author: true,
          },
        },
        replies: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.mapToCommentEntity(comment);
  }

  async findMany(filters: CommentFiltersInput) {
    const where: any = {};

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
        include: {
          author: true,
          parent: {
            include: {
              author: true,
            },
          },
          replies: {
            include: {
              author: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters.limit,
        skip: filters.offset,
      }),
      this.databaseService.comment.count({ where }),
    ]);

    const mappedComments = comments.map(comment => this.mapToCommentEntity(comment));

    return {
      comments: mappedComments,
      hasMore: filters.offset + filters.limit < total,
      total,
    };
  }

  async update(id: string, authorId: string, input: UpdateCommentInput): Promise<Comment> {
    const existingComment = await this.databaseService.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const comment = await this.databaseService.comment.update({
      where: { id },
      data: {
        content: input.content,
      },
      include: {
        author: true,
        parent: {
          include: {
            author: true,
          },
        },
        replies: {
          include: {
            author: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    return this.mapToCommentEntity(comment);
  }

  async remove(id: string, authorId: string, isAdmin: boolean = false): Promise<boolean> {
    const existingComment = await this.databaseService.comment.findUnique({
      where: { id },
    });

    if (!existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.authorId !== authorId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.databaseService.comment.delete({
      where: { id },
    });

    return true;
  }

  private async validateEntity(entityType: CommentableType, entityId: string): Promise<void> {
    let exists = false;

    switch (entityType) {
      case CommentableType.CHARACTER:
        const character = await this.databaseService.character.findUnique({
          where: { id: entityId },
        });
        exists = !!character;
        break;
      case CommentableType.IMAGE:
        const image = await this.databaseService.image.findUnique({
          where: { id: entityId },
        });
        exists = !!image;
        break;
      case CommentableType.GALLERY:
        const gallery = await this.databaseService.gallery.findUnique({
          where: { id: entityId },
        });
        exists = !!gallery;
        break;
      case CommentableType.USER:
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

  private async validateParentComment(parentId: string, entityType: CommentableType, entityId: string): Promise<void> {
    const parentComment = await this.databaseService.comment.findUnique({
      where: { id: parentId },
    });

    if (!parentComment) {
      throw new BadRequestException('Parent comment not found');
    }

    // Check if parent comment belongs to the same entity using the new structure
    const parentEntityType = this.getEntityTypeFromComment(parentComment);
    const parentEntityId = this.getEntityIdFromComment(parentComment);

    if (parentEntityType !== entityType || parentEntityId !== entityId) {
      throw new BadRequestException('Parent comment must belong to the same entity');
    }
  }

  private buildCommentCreateData(
    authorId: string, 
    content: string, 
    entityType: CommentableType, 
    entityId: string, 
    parentId?: string
  ) {
    const baseData = { 
      content, 
      authorId, 
      parentId 
    };

    switch (entityType) {
      case CommentableType.CHARACTER:
        return { ...baseData, characterId: entityId };
      case CommentableType.IMAGE:
        return { ...baseData, imageId: entityId };
      case CommentableType.GALLERY:
        return { ...baseData, galleryId: entityId };
      case CommentableType.USER:
        return { ...baseData, userId: entityId };
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private getEntityTypeFromComment(comment: any): CommentableType {
    if (comment.characterId) return CommentableType.CHARACTER;
    if (comment.imageId) return CommentableType.IMAGE;
    if (comment.galleryId) return CommentableType.GALLERY;
    if (comment.userId) return CommentableType.USER;
    throw new BadRequestException('Comment has no valid entity type');
  }

  private getEntityIdFromComment(comment: any): string {
    return comment.characterId || comment.imageId || comment.galleryId || comment.userId;
  }

  private addEntityFilterToWhere(where: any, entityType: CommentableType, entityId: string): void {
    switch (entityType) {
      case CommentableType.CHARACTER:
        where.characterId = entityId;
        break;
      case CommentableType.IMAGE:
        where.imageId = entityId;
        break;
      case CommentableType.GALLERY:
        where.galleryId = entityId;
        break;
      case CommentableType.USER:
        where.userId = entityId;
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private addEntityTypeFilterToWhere(where: any, entityType: CommentableType): void {
    switch (entityType) {
      case CommentableType.CHARACTER:
        where.characterId = { not: null };
        break;
      case CommentableType.IMAGE:
        where.imageId = { not: null };
        break;
      case CommentableType.GALLERY:
        where.galleryId = { not: null };
        break;
      case CommentableType.USER:
        where.userId = { not: null };
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }
  }

  private mapToCommentEntity(comment: any): Comment {
    const entityType = this.getEntityTypeFromComment(comment);
    const entityId = this.getEntityIdFromComment(comment);

    return {
      id: comment.id,
      content: comment.content,
      commentableType: entityType,
      commentableId: entityId,
      parentId: comment.parentId,
      isHidden: comment.isHidden,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
      authorId: comment.authorId,
      parent: comment.parent ? this.mapToCommentEntity(comment.parent) : undefined,
      replies: comment.replies?.map((reply: any) => this.mapToCommentEntity(reply)) || [],
      repliesCount: comment._count?.replies || 0,
      // Polymorphic relations will be resolved in the resolver
      character: undefined,
      image: undefined,
      gallery: undefined,
      // Social features will be resolved by field resolvers
      likesCount: 0,
      userHasLiked: false,
    };
  }
}