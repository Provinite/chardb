import { Prisma } from "@chardb/database";
import { 
  MediaFiltersInput,
  CreateTextMediaInput,
  UpdateMediaInput,
  UpdateTextContentInput,
  MediaType
} from "../dto/media.dto";
import { Media, MediaConnection } from "../entities/media.entity";
import { 
  MediaFiltersServiceInput,
  CreateTextMediaServiceInput,
  UpdateMediaServiceInput,
  UpdateTextContentServiceInput,
  MediaTypeFilter
} from "../media.service";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps GraphQL MediaFiltersInput to service input format
 */
export function mapMediaFiltersInputToService(input?: MediaFiltersInput): MediaFiltersServiceInput {
  if (!input) return {};
  
  return {
    search: input.search,
    mediaType: input.mediaType ? mapGraphQLMediaTypeToService(input.mediaType) : undefined,
    visibility: input.visibility,
    ownerId: input.ownerId,
    characterId: input.characterId,
    galleryId: input.galleryId,
    limit: input.limit,
    offset: input.offset,
  };
}

/**
 * Maps GraphQL MediaType to service MediaTypeFilter
 */
function mapGraphQLMediaTypeToService(mediaType: MediaType): MediaTypeFilter {
  switch (mediaType) {
    case MediaType.IMAGE:
      return MediaTypeFilter.IMAGE;
    case MediaType.TEXT:
      return MediaTypeFilter.TEXT;
    default:
      throw new Error(`Unknown MediaType: ${mediaType}`);
  }
}

/**
 * Maps CreateTextMediaInput to service input format
 */
export function mapCreateTextMediaInputToService(
  input: CreateTextMediaInput
): CreateTextMediaServiceInput {
  return {
    title: input.title,
    description: input.description,
    content: input.content,
    formatting: input.formatting,
    visibility: input.visibility,
    characterId: input.characterId,
    galleryId: input.galleryId,
    tags: input.tags,
  };
}

/**
 * Maps UpdateMediaInput to service input format
 */
export function mapUpdateMediaInputToService(
  input: UpdateMediaInput
): UpdateMediaServiceInput {
  const result: UpdateMediaServiceInput = {};
  
  if (input.title !== undefined) result.title = input.title;
  if (input.description !== undefined) result.description = input.description;
  if (input.visibility !== undefined) result.visibility = input.visibility;
  if (input.characterId !== undefined) result.characterId = input.characterId;
  if (input.galleryId !== undefined) result.galleryId = input.galleryId;
  if (input.tags !== undefined) result.tags = input.tags;
  
  return result;
}

/**
 * Maps UpdateTextContentInput to service input format
 */
export function mapUpdateTextContentInputToService(
  input: UpdateTextContentInput
): UpdateTextContentServiceInput {
  const result: UpdateTextContentServiceInput = {};
  
  if (input.content !== undefined) result.content = input.content;
  if (input.formatting !== undefined) result.formatting = input.formatting;
  
  return result;
}

type PrismaMedia = Prisma.MediaGetPayload<{}>;

/**
 * Maps Prisma Media result to GraphQL Media entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaMediaToGraphQL(prismaMedia: PrismaMedia) {
  return {
    id: prismaMedia.id,
    title: prismaMedia.title,
    description: prismaMedia.description ?? undefined,
    ownerId: prismaMedia.ownerId,
    characterId: prismaMedia.characterId ?? undefined,
    galleryId: prismaMedia.galleryId ?? undefined,
    visibility: prismaMedia.visibility,
    imageId: prismaMedia.imageId ?? undefined,
    textContentId: prismaMedia.textContentId ?? undefined,
    createdAt: prismaMedia.createdAt,
    updatedAt: prismaMedia.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaMediaConnectionToGraphQL(serviceResult: {
  media: PrismaMedia[];
  total: number;
  imageCount: number;
  textCount: number;
  hasMore: boolean;
}): MediaConnection {
  return {
    media: serviceResult.media.map(mapPrismaMediaToGraphQL),
    total: serviceResult.total,
    imageCount: serviceResult.imageCount,
    textCount: serviceResult.textCount,
    hasMore: serviceResult.hasMore,
  };
}