import { Prisma } from '@chardb/database';
import {
  ItemType as ItemTypeEntity,
  ItemTypeConnection,
} from '../entities/item-type.entity';

// Type alias for Prisma ItemType payload
type PrismaItemType = Prisma.ItemTypeGetPayload<{}>;

/**
 * Maps a Prisma ItemType model to a GraphQL ItemType entity
 */
export function mapPrismaItemTypeToGraphQL(
  prismaItemType: PrismaItemType,
): ItemTypeEntity {
  return {
    id: prismaItemType.id,
    name: prismaItemType.name,
    description: prismaItemType.description ?? undefined,
    communityId: prismaItemType.communityId,
    category: prismaItemType.category ?? undefined,
    isStackable: prismaItemType.isStackable,
    maxStackSize: prismaItemType.maxStackSize ?? undefined,
    isTradeable: prismaItemType.isTradeable,
    isConsumable: prismaItemType.isConsumable,
    imageUrl: prismaItemType.imageUrl ?? undefined,
    iconUrl: prismaItemType.iconUrl ?? undefined,
    colorId: prismaItemType.colorId ?? undefined,
    metadata: prismaItemType.metadata,
    createdAt: prismaItemType.createdAt,
    updatedAt: prismaItemType.updatedAt,
  };
}

/**
 * Maps a service result to a GraphQL ItemTypeConnection
 */
export function mapPrismaItemTypeConnectionToGraphQL(result: {
  itemTypes: PrismaItemType[];
  total: number;
  hasMore: boolean;
}): ItemTypeConnection {
  return {
    itemTypes: result.itemTypes.map(mapPrismaItemTypeToGraphQL),
    total: result.total,
    hasMore: result.hasMore,
  };
}
