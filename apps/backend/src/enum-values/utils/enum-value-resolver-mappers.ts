import { CreateEnumValueInput, UpdateEnumValueInput } from "../dto/enum-value.dto";
import { EnumValue, EnumValueConnection } from "../entities/enum-value.entity";
import { Prisma } from "@chardb/database";

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateEnumValueInput to service input format
 */
export function mapCreateEnumValueInputToService(input: CreateEnumValueInput) {
  return {
    name: input.name,
    order: input.order,
    traitId: input.traitId,
    colorId: input.colorId,
  };
}

/**
 * Maps UpdateEnumValueInput to service input format
 */
export function mapUpdateEnumValueInputToService(input: UpdateEnumValueInput) {
  const result: {
    name?: string;
    order?: number;
    traitId?: string;
    colorId?: string | null;
  } = {};

  if (input.name !== undefined) result.name = input.name;
  if (input.order !== undefined) result.order = input.order;
  if (input.traitId !== undefined) result.traitId = input.traitId;
  if (input.colorId !== undefined) result.colorId = input.colorId;

  return result;
}

type PrismaEnumValue = Prisma.EnumValueGetPayload<{}>;

/**
 * Maps Prisma EnumValue result to GraphQL EnumValue entity
 * Only includes scalar fields - relations are handled by field resolvers
 */
export function mapPrismaEnumValueToGraphQL(prismaEnumValue: PrismaEnumValue): EnumValue {
  return {
    id: prismaEnumValue.id,
    name: prismaEnumValue.name,
    order: prismaEnumValue.order,
    traitId: prismaEnumValue.traitId,
    colorId: prismaEnumValue.colorId ?? undefined,
    createdAt: prismaEnumValue.createdAt,
    updatedAt: prismaEnumValue.updatedAt,
    // Relations handled by field resolvers
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaEnumValueConnectionToGraphQL(serviceResult: {
  nodes: PrismaEnumValue[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): EnumValueConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaEnumValueToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}