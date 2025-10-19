import { Prisma } from '@chardb/database';
import {
  CreateCommentInput,
  UpdateCommentInput,
  CommentFiltersInput,
  CommentableType,
} from '../dto/comment.dto';
import { CommentConnection } from '../entities/comment.entity';
import {
  CreateCommentServiceInput,
  UpdateCommentServiceInput,
  CommentFiltersServiceInput,
  CommentableTypeFilter,
} from '../comments.service';
import { assertNever } from '../../shared/utils/assertNever';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps GraphQL CommentableType to service CommentableTypeFilter
 */
function mapGraphQLCommentableTypeToService(
  commentableType: CommentableType,
): CommentableTypeFilter {
  switch (commentableType) {
    case CommentableType.CHARACTER:
      return CommentableTypeFilter.CHARACTER;
    case CommentableType.IMAGE:
      return CommentableTypeFilter.IMAGE;
    case CommentableType.GALLERY:
      return CommentableTypeFilter.GALLERY;
    case CommentableType.USER:
      return CommentableTypeFilter.USER;
    default:
      return assertNever(commentableType);
  }
}

/**
 * Maps service CommentableTypeFilter to GraphQL CommentableType
 */
function mapServiceCommentableTypeToGraphQL(
  commentableType: CommentableTypeFilter,
): CommentableType {
  switch (commentableType) {
    case CommentableTypeFilter.CHARACTER:
      return CommentableType.CHARACTER;
    case CommentableTypeFilter.IMAGE:
      return CommentableType.IMAGE;
    case CommentableTypeFilter.GALLERY:
      return CommentableType.GALLERY;
    case CommentableTypeFilter.USER:
      return CommentableType.USER;
    default:
      return assertNever(commentableType);
  }
}

/**
 * Maps GraphQL CreateCommentInput to service input format
 */
export function mapCreateCommentInputToService(
  input: CreateCommentInput,
): CreateCommentServiceInput {
  return {
    content: input.content,
    entityType: mapGraphQLCommentableTypeToService(input.entityType),
    entityId: input.entityId,
    parentId: input.parentId,
  };
}

/**
 * Maps GraphQL UpdateCommentInput to service input format
 */
export function mapUpdateCommentInputToService(
  input: UpdateCommentInput,
): UpdateCommentServiceInput {
  return {
    content: input.content,
  };
}

/**
 * Maps GraphQL CommentFiltersInput to service input format
 */
export function mapCommentFiltersInputToService(
  input?: CommentFiltersInput,
): CommentFiltersServiceInput {
  if (!input) return {};

  return {
    entityType: input.entityType
      ? mapGraphQLCommentableTypeToService(input.entityType)
      : undefined,
    entityId: input.entityId,
    parentId: input.parentId,
    limit: input.limit,
    offset: input.offset,
  };
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaComment = Prisma.CommentGetPayload<{}>;

/**
 * Maps Prisma Comment result to GraphQL Comment entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaCommentToGraphQL(prismaComment: PrismaComment) {
  // Determine commentable type and ID from the Prisma comment
  let commentableType: CommentableType;
  let commentableId: string;

  if (prismaComment.characterId) {
    commentableType = CommentableType.CHARACTER;
    commentableId = prismaComment.characterId;
  } else if (prismaComment.imageId) {
    commentableType = CommentableType.IMAGE;
    commentableId = prismaComment.imageId;
  } else if (prismaComment.galleryId) {
    commentableType = CommentableType.GALLERY;
    commentableId = prismaComment.galleryId;
  } else if (prismaComment.userId) {
    commentableType = CommentableType.USER;
    commentableId = prismaComment.userId;
  } else {
    throw new Error('Comment has no valid entity type');
  }

  return {
    id: prismaComment.id,
    content: prismaComment.content,
    commentableType,
    commentableId,
    authorId: prismaComment.authorId,
    parentId: prismaComment.parentId ?? undefined,
    isHidden: prismaComment.isHidden,
    createdAt: prismaComment.createdAt,
    updatedAt: prismaComment.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaCommentConnectionToGraphQL(serviceResult: {
  comments: PrismaComment[];
  total: number;
  hasMore: boolean;
}): CommentConnection {
  return {
    comments: serviceResult.comments.map(mapPrismaCommentToGraphQL),
    total: serviceResult.total,
    hasMore: serviceResult.hasMore,
  };
}
