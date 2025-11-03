import { Prisma } from '@chardb/database';
import { Item as ItemEntity, ItemConnection } from '../entities/item.entity';

// Type alias for Prisma Item payload (with included relations)
type PrismaItem = Prisma.ItemGetPayload<{
  include: {
    itemType: {
      include: {
        community: true;
      };
    };
    owner: true;
  };
}>;

// Also support basic Item without includes
type PrismaItemBasic = Prisma.ItemGetPayload<{}>;

/**
 * Maps a Prisma Item model to a GraphQL Item entity
 * Handles both basic Items and Items with included relations
 */
export function mapPrismaItemToGraphQL(
  prismaItem: PrismaItem | PrismaItemBasic,
): ItemEntity {
  return {
    id: prismaItem.id,
    itemTypeId: prismaItem.itemTypeId,
    ownerId: prismaItem.ownerId ?? undefined,
    quantity: prismaItem.quantity,
    metadata: prismaItem.metadata,
    createdAt: prismaItem.createdAt,
    updatedAt: prismaItem.updatedAt,
  };
}

/**
 * Maps a service result to a GraphQL ItemConnection
 */
export function mapPrismaItemConnectionToGraphQL(result: {
  items: (PrismaItem | PrismaItemBasic)[];
  total: number;
  hasMore: boolean;
}): ItemConnection {
  return {
    items: result.items.map(mapPrismaItemToGraphQL),
    total: result.total,
    hasMore: result.hasMore,
  };
}
