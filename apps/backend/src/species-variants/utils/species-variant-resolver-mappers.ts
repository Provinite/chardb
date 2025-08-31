import { CreateSpeciesVariantInput, UpdateSpeciesVariantInput } from "../dto/species-variant.dto";
import { SpeciesVariant, SpeciesVariantConnection } from "../entities/species-variant.entity";
import { CreateSpeciesVariantServiceInput, UpdateSpeciesVariantServiceInput } from "../species-variants.service";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateSpeciesVariantInput to service input format
 */
export function mapCreateSpeciesVariantInputToService(input: CreateSpeciesVariantInput): CreateSpeciesVariantServiceInput {
  return {
    name: input.name,
    speciesId: input.speciesId,
  };
}

/**
 * Maps UpdateSpeciesVariantInput to service input format
 */
export function mapUpdateSpeciesVariantInputToService(input: UpdateSpeciesVariantInput): UpdateSpeciesVariantServiceInput {
  const result: UpdateSpeciesVariantServiceInput = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.speciesId !== undefined) result.speciesId = input.speciesId;

  return result;
}

type PrismaSpeciesVariant = Prisma.SpeciesVariantGetPayload<{}>;

/**
 * Maps Prisma SpeciesVariant result to GraphQL SpeciesVariant entity
 * Only includes scalar fields - relations handled by field resolvers
 */
export function mapPrismaSpeciesVariantToGraphQL(prismaSpeciesVariant: PrismaSpeciesVariant): SpeciesVariant {
  return {
    id: prismaSpeciesVariant.id,
    name: prismaSpeciesVariant.name,
    speciesId: prismaSpeciesVariant.speciesId,
    createdAt: prismaSpeciesVariant.createdAt,
    updatedAt: prismaSpeciesVariant.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaSpeciesVariantConnectionToGraphQL(serviceResult: {
  nodes: PrismaSpeciesVariant[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): SpeciesVariantConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaSpeciesVariantToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}