import { Prisma } from '@chardb/database';
import {
  TraitReview,
  TraitReviewQueueItem,
  TraitReviewQueueConnection,
} from '../entities/trait-review.entity';
import { mapPrismaCharacterToGraphQL } from '../../characters/utils/character-resolver-mappers';
import { mapPrismaUserToGraphQL } from '../../users/utils/user-resolver-mappers';
import { CharacterTraitValue } from '../../shared/types/character-trait.types';

/**
 * Shared include pattern for trait review with character and resolver
 */
export const traitReviewInclude = {
  character: true,
  resolvedBy: true,
} as const;

/**
 * Shared include pattern for queue items with full relation chain
 */
export const traitReviewQueueInclude = {
  character: {
    include: {
      species: true,
      speciesVariant: true,
    },
  },
  resolvedBy: true,
} as const;

/**
 * Prisma payload type for TraitReview with basic includes
 */
export type PrismaTraitReview = Prisma.TraitReviewGetPayload<{
  include: typeof traitReviewInclude;
}>;

/**
 * Prisma payload type for queue item with full relation chain
 */
export type PrismaTraitReviewQueueItem = Prisma.TraitReviewGetPayload<{
  include: typeof traitReviewQueueInclude;
}>;

/**
 * Map JSON trait values to GraphQL CharacterTraitValue array
 */
function mapTraitValuesJson(json: PrismaJson.CharacterTraitValuesJson): CharacterTraitValue[] {
  return json.map((tv) => ({
    traitId: tv.traitId,
    value: tv.value,
  }));
}

/**
 * Maps Prisma TraitReview to GraphQL entity
 */
export function mapPrismaTraitReviewToGraphQL(
  prismaReview: PrismaTraitReview,
): TraitReview {
  return {
    id: prismaReview.id,
    characterId: prismaReview.characterId,
    status: prismaReview.status,
    source: prismaReview.source,
    proposedTraitValues: mapTraitValuesJson(prismaReview.proposedTraitValues),
    previousTraitValues: mapTraitValuesJson(prismaReview.previousTraitValues),
    appliedTraitValues: prismaReview.appliedTraitValues
      ? mapTraitValuesJson(prismaReview.appliedTraitValues)
      : undefined,
    resolvedAt: prismaReview.resolvedAt ?? undefined,
    resolvedById: prismaReview.resolvedById ?? undefined,
    rejectionReason: prismaReview.rejectionReason ?? undefined,
    createdAt: prismaReview.createdAt,
    updatedAt: prismaReview.updatedAt,
    character: mapPrismaCharacterToGraphQL(prismaReview.character),
    resolvedBy: prismaReview.resolvedBy
      ? mapPrismaUserToGraphQL(prismaReview.resolvedBy)
      : undefined,
  };
}

/**
 * Maps Prisma queue item to GraphQL TraitReviewQueueItem
 */
export function mapPrismaTraitReviewQueueItemToGraphQL(
  prismaReview: PrismaTraitReviewQueueItem,
): TraitReviewQueueItem {
  const character = prismaReview.character;

  return {
    review: {
      id: prismaReview.id,
      characterId: prismaReview.characterId,
      status: prismaReview.status,
      source: prismaReview.source,
      proposedTraitValues: mapTraitValuesJson(prismaReview.proposedTraitValues),
      previousTraitValues: mapTraitValuesJson(prismaReview.previousTraitValues),
      appliedTraitValues: prismaReview.appliedTraitValues
        ? mapTraitValuesJson(prismaReview.appliedTraitValues)
        : undefined,
      resolvedAt: prismaReview.resolvedAt ?? undefined,
      resolvedById: prismaReview.resolvedById ?? undefined,
      rejectionReason: prismaReview.rejectionReason ?? undefined,
      createdAt: prismaReview.createdAt,
      updatedAt: prismaReview.updatedAt,
      character: mapPrismaCharacterToGraphQL(character),
      resolvedBy: prismaReview.resolvedBy
        ? mapPrismaUserToGraphQL(prismaReview.resolvedBy)
        : undefined,
    },
    characterName: character.name,
    characterId: character.id,
    registryId: character.registryId ?? undefined,
    speciesName: character.species?.name ?? undefined,
    variantName: character.speciesVariant?.name ?? undefined,
  };
}

/**
 * Service result type for queue queries
 */
export interface TraitReviewQueueServiceResult {
  items: PrismaTraitReviewQueueItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Maps service queue result to GraphQL TraitReviewQueueConnection
 */
export function mapTraitReviewQueueResultToGraphQL(
  result: TraitReviewQueueServiceResult,
): TraitReviewQueueConnection {
  return {
    items: result.items.map(mapPrismaTraitReviewQueueItemToGraphQL),
    total: result.total,
    hasMore: result.hasMore,
  };
}
