import {
  CreateEnumValueSettingInput,
  UpdateEnumValueSettingInput,
} from '../dto/enum-value-setting.dto';
import {
  EnumValueSetting,
  EnumValueSettingConnection,
} from '../entities/enum-value-setting.entity';
import { Prisma } from '@chardb/database';

/**
 * Resolver layer mapping functions to convert between GraphQL DTOs and service types
 */

/**
 * Maps CreateEnumValueSettingInput to service input format
 */
export function mapCreateEnumValueSettingInputToService(
  input: CreateEnumValueSettingInput,
) {
  return {
    enumValueId: input.enumValueId,
    speciesVariantId: input.speciesVariantId,
  };
}

/**
 * Maps UpdateEnumValueSettingInput to service input format
 */
export function mapUpdateEnumValueSettingInputToService(
  input: UpdateEnumValueSettingInput,
) {
  const result: {
    enumValueId?: string;
    speciesVariantId?: string;
  } = {};

  if (input.enumValueId !== undefined) result.enumValueId = input.enumValueId;
  if (input.speciesVariantId !== undefined)
    result.speciesVariantId = input.speciesVariantId;

  return result;
}

// eslint-disable-next-line @typescript-eslint/ban-types
type PrismaEnumValueSetting = Prisma.EnumValueSettingGetPayload<{}>;

/**
 * Maps Prisma EnumValueSetting result to GraphQL EnumValueSetting entity
 * Only includes scalar fields - relations are handled by field resolvers
 */
export function mapPrismaEnumValueSettingToGraphQL(
  prismaEnumValueSetting: PrismaEnumValueSetting,
): EnumValueSetting {
  return {
    id: prismaEnumValueSetting.id,
    enumValueId: prismaEnumValueSetting.enumValueId,
    speciesVariantId: prismaEnumValueSetting.speciesVariantId,
    createdAt: prismaEnumValueSetting.createdAt,
    updatedAt: prismaEnumValueSetting.updatedAt,
    // Relations handled by field resolvers
  };
}

/**
 * Maps service connection result to GraphQL connection
 */
export function mapPrismaEnumValueSettingConnectionToGraphQL(serviceResult: {
  nodes: PrismaEnumValueSetting[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): EnumValueSettingConnection {
  return {
    nodes: serviceResult.nodes.map(mapPrismaEnumValueSettingToGraphQL),
    totalCount: serviceResult.totalCount,
    hasNextPage: serviceResult.hasNextPage,
    hasPreviousPage: serviceResult.hasPreviousPage,
  };
}
