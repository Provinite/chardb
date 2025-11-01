import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { PendingOwnershipService } from '../pending-ownership/pending-ownership.service';
import { DiscordService } from '../discord/discord.service';
import { Prisma, ExternalAccountProvider } from '@chardb/database';
import { ItemTypeFilters } from './dto/item-type.dto';
import { ItemFilters } from './dto/item.dto';

export interface PendingOwnerInput {
  provider: ExternalAccountProvider;
  providerAccountId: string;
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly discordService: DiscordService,
  ) {}

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
    // Check if any items exist with this item type
    const itemCount = await this.db.item.count({
      where: { itemTypeId: id },
    });

    if (itemCount > 0) {
      throw new ConflictException(
        `Cannot delete item type: ${itemCount} item(s) of this type exist. Remove all items of this type before deleting.`,
      );
    }

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
   *
   * Can also create orphaned items (userId = null) or items with pending ownership.
   */
  async grantItem(input: {
    itemTypeId: string;
    userId?: string | null; // Optional for orphaned items
    quantity: number;
    metadata?: any;
    pendingOwner?: PendingOwnerInput; // For pending ownership
  }) {
    const { itemTypeId, userId, quantity, metadata, pendingOwner } = input;

    // Determine actual owner: null if pending, otherwise userId
    const actualOwnerId = pendingOwner ? null : userId;

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

    // Verify user exists and is member of community (skip for orphaned items)
    if (actualOwnerId) {
      const user = await this.db.user.findUnique({
        where: { id: actualOwnerId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${actualOwnerId} not found`);
      }

      // Verify user is a member of the community that owns this item type
      const membership = await this.db.communityMember.findFirst({
        where: {
          userId: actualOwnerId,
          role: {
            communityId: itemType.communityId,
          },
        },
      });

      if (!membership) {
        throw new BadRequestException(
          `User is not a member of the community that owns this item type`,
        );
      }
    }

    // Check if stackable and user already has this item type (skip for orphaned/pending items)
    if (itemType.isStackable && actualOwnerId) {
      const existingItem = await this.db.item.findFirst({
        where: {
          itemTypeId,
          ownerId: actualOwnerId,
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
    const item = await this.db.item.create({
      data: {
        itemType: {
          connect: { id: itemTypeId },
        },
        // Owner connection (may be null for orphaned items)
        ...(actualOwnerId ? { owner: { connect: { id: actualOwnerId } } } : {}),
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

    // Create pending ownership record if provided
    if (pendingOwner) {
      let resolvedAccountId = pendingOwner.providerAccountId;

      // Resolve Discord username to ID if necessary
      if (pendingOwner.provider === ExternalAccountProvider.DISCORD) {
        resolvedAccountId = await this.resolveDiscordIdentifier(
          itemType.communityId,
          pendingOwner.providerAccountId,
        );
      }

      await this.pendingOwnershipService.createForItem(
        item.id,
        pendingOwner.provider,
        resolvedAccountId,
      );
    }

    return item;
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

  /**
   * Resolve a Discord identifier (username or ID) to a Discord user ID
   * @param communityId The community ID to get the Discord guild from
   * @param identifier The Discord username or user ID
   * @returns The Discord user ID
   * @throws BadRequestException if guild not connected or username not found
   */
  private async resolveDiscordIdentifier(
    communityId: string,
    identifier: string,
  ): Promise<string> {
    // Check if identifier is already a numeric ID (18-19 digits)
    if (/^\d{17,19}$/.test(identifier)) {
      return identifier;
    }

    // It's a username - need to resolve it
    // Get the community to find the Discord guild
    const community = await this.db.community.findUnique({
      where: { id: communityId },
      select: {
        discordGuildId: true,
        name: true,
      },
    });

    if (!community) {
      throw new NotFoundException(`Community with ID ${communityId} not found`);
    }

    if (!community.discordGuildId) {
      throw new BadRequestException(
        `Cannot use Discord username: Community "${community.name}" has no Discord server connected. Please use numeric Discord User ID or ask an admin to connect the Discord server.`,
      );
    }

    // Resolve username to ID
    const userId = await this.discordService.resolveUsernameToId(
      community.discordGuildId,
      identifier,
    );

    if (!userId) {
      throw new NotFoundException(
        `Discord user "${identifier}" not found in community's Discord server`,
      );
    }

    return userId;
  }
}
