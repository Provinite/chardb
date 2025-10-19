import { CreateSpeciesInput, UpdateSpeciesInput } from '../dto/species.dto';
import { Species, SpeciesConnection } from '../entities/species.entity';
import {
  CreateSpeciesServiceInput,
  UpdateSpeciesServiceInput,
} from '../species.service';
import { Prisma } from '@chardb/database';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateSpeciesInput to service input format
 */
export function mapCreateSpeciesInputToService(
  input: CreateSpeciesInput,
): CreateSpeciesServiceInput {
  return {
    name: input.name,
    communityId: input.communityId,
    hasImage: input.hasImage,
  };
}

/**
 * Maps UpdateSpeciesInput to service input format
 */
export function mapUpdateSpeciesInputToService(
  input: UpdateSpeciesInput,
): UpdateSpeciesServiceInput {
  const result: UpdateSpeciesServiceInput = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.communityId !== undefined) result.communityId = input.communityId;
  if (input.hasImage !== undefined) result.hasImage = input.hasImage;

  return result;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaSpecies = Prisma.SpeciesGetPayload<{}>;

/**
 * Maps Prisma Species result to GraphQL Species entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaSpeciesToGraphQL(
  prismaSpecies: PrismaSpecies,
): Species {
  return {
    id: prismaSpecies.id,
    name: prismaSpecies.name,
    communityId: prismaSpecies.communityId,
    hasImage: prismaSpecies.hasImage,
    createdAt: prismaSpecies.createdAt,
    updatedAt: prismaSpecies.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaSpeciesConnectionToGraphQL(serviceResult: {
  nodes: PrismaSpecies[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): SpeciesConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaSpeciesToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
