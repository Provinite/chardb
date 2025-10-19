import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@chardb/database';
import { ItemTypeFilters } from './dto/item-type.dto';
import { ItemFilters } from './dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== ItemType Methods ====================

  async createItemType(input: Prisma.ItemTypeCreateInput) {
    try {
      return await this.db.itemType.create({
        data: input,
        include: {
          community: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new ConflictException(
          'An item type with this name already exists in this community',
        );
      }
      throw error;
    }
  }

  async findAllItemTypes(filters: ItemTypeFilters = {}) {
    const { limit = 20, offset = 0, communityId, category, search } = filters;

    const where: Prisma.ItemTypeWhereInput = {
      AND: [
        communityId ? { communityId } : {},
        category ? { category } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [itemTypes, total] = await Promise.all([
      this.db.itemType.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          community: true,
        },
      }),
      this.db.itemType.count({ where }),
    ]);

    return {
      itemTypes,
      total,
      hasMore: offset + itemTypes.length < total,
    };
  }

  async findItemTypeById(id: string) {
    const itemType = await this.db.itemType.findUnique({
      where: { id },
      include: {
        community: true,
      },
    });

    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${id} not found`);
    }

    return itemType;
  }

  async updateItemType(id: string, input: Prisma.ItemTypeUpdateInput) {
    try {
      const itemType = await this.db.itemType.update({
        where: { id },
        data: input,
        include: {
          community: true,
        },
      });

      return itemType;
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found
        throw new NotFoundException(`ItemType with ID ${id} not found`);
      }
      if (error.code === 'P2002') {
        throw new ConflictException(
          'An item type with this name already exists in this community',
        );
      }
      throw error;
    }
  }

  async deleteItemType(id: string) {
    try {
      await this.db.itemType.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`ItemType with ID ${id} not found`);
      }
      throw error;
    }
  }

  // ==================== Item Methods ====================

  /**
   * Grant an item to a user. If the item type is stackable and the user
   * already has that item type, increment the quantity instead of creating
   * a new item.
   */
  async grantItem(input: {
    itemTypeId: string;
    userId: string;
    quantity: number;
    metadata?: any;
  }) {
    const { itemTypeId, userId, quantity, metadata } = input;

    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    // Get the item type to check if it's stackable
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
    });

    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${itemTypeId} not found`);
    }

    // Verify user exists
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if stackable and user already has this item type
    if (itemType.isStackable) {
      const existingItem = await this.db.item.findFirst({
        where: {
          itemTypeId,
          ownerId: userId,
        },
      });

      if (existingItem) {
        // Increment quantity on existing item
        const newQuantity = existingItem.quantity + quantity;

        // Check max stack size
        if (itemType.maxStackSize && newQuantity > itemType.maxStackSize) {
          throw new BadRequestException(
            `Cannot add ${quantity} items. Max stack size is ${itemType.maxStackSize} and user already has ${existingItem.quantity}`,
          );
        }

        return await this.db.item.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            itemType: {
              include: {
                community: true,
              },
            },
            owner: true,
          },
        });
      }
    }

    // Create new item
    return await this.db.item.create({
      data: {
        itemType: {
          connect: { id: itemTypeId },
        },
        owner: {
          connect: { id: userId },
        },
        quantity,
        metadata: metadata || {},
      },
      include: {
        itemType: {
          include: {
            community: true,
          },
        },
        owner: true,
      },
    });
  }

  async findAllItems(filters: ItemFilters = {}) {
    const { limit = 20, offset = 0, ownerId, itemTypeId, communityId } =
      filters;

    const where: Prisma.ItemWhereInput = {
      AND: [
        ownerId ? { ownerId } : {},
        itemTypeId ? { itemTypeId } : {},
        communityId ? { itemType: { communityId } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.db.item.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          itemType: {
            include: {
              community: true,
            },
          },
          owner: true,
        },
      }),
      this.db.item.count({ where }),
    ]);

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  async findItemById(id: string) {
    const item = await this.db.item.findUnique({
      where: { id },
      include: {
        itemType: {
          include: {
            community: true,
          },
        },
        owner: true,
      },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async updateItem(id: string, input: Prisma.ItemUpdateInput) {
    try {
      const item = await this.db.item.update({
        where: { id },
        data: input,
        include: {
          itemType: {
            include: {
              community: true,
            },
          },
          owner: true,
        },
      });

      return item;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }

  async deleteItem(id: string) {
    try {
      await this.db.item.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }
}
