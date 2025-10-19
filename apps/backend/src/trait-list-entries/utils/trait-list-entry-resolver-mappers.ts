import {
  CreateTraitListEntryInput,
  UpdateTraitListEntryInput,
} from '../dto/trait-list-entry.dto';
import {
  TraitListEntry,
  TraitListEntryConnection,
} from '../entities/trait-list-entry.entity';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';
import { Prisma, $Enums } from '@chardb/database';
import { assertNever } from '../../shared/utils/assertNever';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps GraphQL TraitValueType to Prisma TraitValueType
 */
function mapGraphQLTraitValueTypeToPrisma(
  gqlType: TraitValueType,
): $Enums.TraitValueType {
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
      return assertNever(gqlType, `Unknown GraphQL TraitValueType: ${gqlType}`);
  }
}

/**
 * Maps Prisma TraitValueType to GraphQL TraitValueType
 */
function mapPrismaTraitValueTypeToGraphQL(
  prismaType: $Enums.TraitValueType,
): TraitValueType {
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
      return assertNever(
        prismaType,
        `Unknown Prisma TraitValueType: ${prismaType}`,
      );
  }
}

/**
 * Maps CreateTraitListEntryInput to service input format
 */
export function mapCreateTraitListEntryInputToService(
  input: CreateTraitListEntryInput,
) {
  return {
    traitId: input.traitId,
    speciesVariantId: input.speciesVariantId,
    order: input.order,
    required: input.required,
    valueType: mapGraphQLTraitValueTypeToPrisma(input.valueType),
    defaultValueString: input.defaultValueString,
    defaultValueInt: input.defaultValueInt,
    defaultValueTimestamp: input.defaultValueTimestamp,
  };
}

/**
 * Maps UpdateTraitListEntryInput to service input format
 */
export function mapUpdateTraitListEntryInputToService(
  input: UpdateTraitListEntryInput,
) {
  const result: {
    traitId?: string;
    speciesVariantId?: string;
    order?: number;
    required?: boolean;
    valueType?: $Enums.TraitValueType;
    defaultValueString?: string;
    defaultValueInt?: number;
    defaultValueTimestamp?: Date;
  } = {};

  if (input.traitId !== undefined) result.traitId = input.traitId;
  if (input.speciesVariantId !== undefined)
    result.speciesVariantId = input.speciesVariantId;
  if (input.order !== undefined) result.order = input.order;
  if (input.required !== undefined) result.required = input.required;
  if (input.valueType !== undefined)
    result.valueType = mapGraphQLTraitValueTypeToPrisma(input.valueType);
  if (input.defaultValueString !== undefined)
    result.defaultValueString = input.defaultValueString;
  if (input.defaultValueInt !== undefined)
    result.defaultValueInt = input.defaultValueInt;
  if (input.defaultValueTimestamp !== undefined)
    result.defaultValueTimestamp = input.defaultValueTimestamp;

  return result;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaTraitListEntry = Prisma.TraitListEntryGetPayload<{}>;

/**
 * Maps Prisma TraitListEntry result to GraphQL TraitListEntry entity
 * Only includes scalar fields - relations and computed fields handled by field resolvers
 */
export function mapPrismaTraitListEntryToGraphQL(
  prismaTraitListEntry: PrismaTraitListEntry,
): TraitListEntry {
  return {
    id: prismaTraitListEntry.id,
    order: prismaTraitListEntry.order,
    required: prismaTraitListEntry.required,
    valueType: mapPrismaTraitValueTypeToGraphQL(prismaTraitListEntry.valueType),
    defaultValueString: prismaTraitListEntry.defaultValueString ?? undefined,
    defaultValueInt: prismaTraitListEntry.defaultValueInt ?? undefined,
    defaultValueTimestamp:
      prismaTraitListEntry.defaultValueTimestamp ?? undefined,
    traitId: prismaTraitListEntry.traitId,
    speciesVariantId: prismaTraitListEntry.speciesVariantId,
    createdAt: prismaTraitListEntry.createdAt,
    updatedAt: prismaTraitListEntry.updatedAt,
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaTraitListEntryConnectionToGraphQL(serviceResult: {
  nodes: PrismaTraitListEntry[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): TraitListEntryConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaTraitListEntryToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
