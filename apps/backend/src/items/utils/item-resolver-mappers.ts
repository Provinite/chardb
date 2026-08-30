import { Item, Prisma } from "@chardb/database";
import { Item as ItemEntity, ItemConnection } from "../entities/item.entity";

type PrismaItemWithRelations = Prisma.ItemGetPayload<{
  include: {
    itemType: {
      include: {
        community: true;
      };
    };
    owner: true;
  };
}>;

/** Accepts an Item with or without the relations the services include. */
export function mapPrismaItemToGraphQL(
  prismaItem: Item | PrismaItemWithRelations,
): ItemEntity {
  return {
    id: prismaItem.id,
    itemTypeId: prismaItem.itemTypeId,
    ownerId: prismaItem.ownerId ?? undefined,
    destroyedAt: prismaItem.destroyedAt,
    metadata: prismaItem.metadata,
    createdAt: prismaItem.createdAt,
    updatedAt: prismaItem.updatedAt,
  };
}

/**
 * Maps a service result to a GraphQL ItemConnection
 */
export function mapPrismaItemConnectionToGraphQL(result: {
  items: (Item | PrismaItemWithRelations)[];
  total: number;
  hasMore: boolean;
}): ItemConnection {
  return {
    items: result.items.map(mapPrismaItemToGraphQL),
    total: result.total,
    hasMore: result.hasMore,
  };
}
