import { CreateTraitInput, UpdateTraitInput } from "../dto/trait.dto";
import { Trait, TraitConnection } from "../entities/trait.entity";
import { TraitValueType } from "../../shared/enums/trait-value-type.enum";
import { Prisma, $Enums } from "@chardb/database";
import { assertNever } from "../../shared/utils/assertNever";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Converts GraphQL TraitValueType to Prisma TraitValueType
 */
function mapGraphQLTraitValueTypeToPrisma(gqlType: TraitValueType): $Enums.TraitValueType {
  switch (gqlType) {
    case TraitValueType.STRING:
      return $Enums.TraitValueType.STRING;
    case TraitValueType.INTEGER:
      return $Enums.TraitValueType.INTEGER;
    case TraitValueType.TIMESTAMP:
      return $Enums.TraitValueType.TIMESTAMP;
    case TraitValueType.ENUM:
      return $Enums.TraitValueType.ENUM;
    default:
      assertNever(gqlType, `Unknown GraphQL TraitValueType: ${gqlType}`);
  }
}

/**
 * Converts Prisma TraitValueType to GraphQL TraitValueType
 */
function mapPrismaTraitValueTypeToGraphQL(prismaType: $Enums.TraitValueType): TraitValueType {
  switch (prismaType) {
    case $Enums.TraitValueType.STRING:
      return TraitValueType.STRING;
    case $Enums.TraitValueType.INTEGER:
      return TraitValueType.INTEGER;
    case $Enums.TraitValueType.TIMESTAMP:
      return TraitValueType.TIMESTAMP;
    case $Enums.TraitValueType.ENUM:
      return TraitValueType.ENUM;
    default:
      assertNever(prismaType, `Unknown Prisma TraitValueType: ${prismaType}`);
  }
}

/**
 * Maps CreateTraitInput to service input format
 */
export function mapCreateTraitInputToService(input: CreateTraitInput) {
  return {
    name: input.name,
    valueType: mapGraphQLTraitValueTypeToPrisma(input.valueType),
    speciesId: input.speciesId,
  };
}

/**
 * Maps UpdateTraitInput to service input format
 */
export function mapUpdateTraitInputToService(input: UpdateTraitInput) {
  const result: {
    name?: string;
    valueType?: $Enums.TraitValueType;
    speciesId?: string;
  } = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.valueType !== undefined) result.valueType = mapGraphQLTraitValueTypeToPrisma(input.valueType);
  if (input.speciesId !== undefined) result.speciesId = input.speciesId;

  return result;
}

type PrismaTrait = Prisma.TraitGetPayload<{}>;

/**
 * Maps Prisma Trait result to GraphQL Trait entity
 * Only includes scalar fields - relations are handled by field resolvers
 */
export function mapPrismaTraitToGraphQL(prismaTrait: PrismaTrait): Trait {
  return {
    id: prismaTrait.id,
    name: prismaTrait.name,
    valueType: mapPrismaTraitValueTypeToGraphQL(prismaTrait.valueType),
    speciesId: prismaTrait.speciesId,
    createdAt: prismaTrait.createdAt,
    updatedAt: prismaTrait.updatedAt,
    // Relations handled by field resolvers
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaTraitConnectionToGraphQL(serviceResult: {
  nodes: PrismaTrait[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): TraitConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaTraitToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}