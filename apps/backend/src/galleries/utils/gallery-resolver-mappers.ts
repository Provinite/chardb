import { CreateGalleryInput, UpdateGalleryInput } from "../dto/gallery.dto";
import { Gallery, GalleryConnection } from "../entities/gallery.entity";
import { 
  CreateGalleryServiceInput, 
  UpdateGalleryServiceInput,
  GalleryFiltersServiceInput 
} from "../galleries.service";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateGalleryInput to service input format
 */
export function mapCreateGalleryInputToService(input: CreateGalleryInput): CreateGalleryServiceInput {
  return {
    name: input.name,
    description: input.description,
    characterId: input.characterId,
    visibility: input.visibility,
    sortOrder: input.sortOrder,
  };
}

/**
 * Maps UpdateGalleryInput to service input format
 */
export function mapUpdateGalleryInputToService(input: UpdateGalleryInput): UpdateGalleryServiceInput {
  const result: UpdateGalleryServiceInput = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.description !== undefined) result.description = input.description;
  if (input.characterId !== undefined) result.characterId = input.characterId;
  if (input.visibility !== undefined) result.visibility = input.visibility;
  if (input.sortOrder !== undefined) result.sortOrder = input.sortOrder;

  return result;
}

type PrismaGallery = Prisma.GalleryGetPayload<{}>;

/**
 * Maps Prisma Gallery result to GraphQL Gallery entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaGalleryToGraphQL(prismaGallery: PrismaGallery): Gallery {
  return {
    id: prismaGallery.id,
    name: prismaGallery.name,
    description: prismaGallery.description ?? undefined,
    ownerId: prismaGallery.ownerId,
    characterId: prismaGallery.characterId ?? undefined,
    visibility: prismaGallery.visibility,
    sortOrder: prismaGallery.sortOrder,
    createdAt: prismaGallery.createdAt,
    updatedAt: prismaGallery.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaGalleryConnectionToGraphQL(serviceResult: {
  galleries: PrismaGallery[];
  total: number;
  hasMore: boolean;
}): GalleryConnection {
  return {
    galleries: serviceResult.galleries.map(mapPrismaGalleryToGraphQL),
    total: serviceResult.total,
    hasMore: serviceResult.hasMore,
  };
}