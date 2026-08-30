import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../database/database.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { DiscordService } from "../discord/discord.service";
import {
  Prisma,
  ExternalAccountProvider,
  ItemTransactionKind,
  ItemTransactionSource,
} from "@chardb/database";
import {
  ItemTransactionsService,
  type DbClient,
} from "../item-transactions/item-transactions.service";
import { ItemTypeFilters } from "./dto/item-type.dto";
import { ItemFilters } from "./dto/item.dto";

export interface PendingOwnerInput {
  provider: ExternalAccountProvider;
  providerAccountId: string;
  displayIdentifier?: string;
}

/**
 * Who caused a write, and why.
 *
 * Every item mutation carries one so the ledger row it produces can name a
 * responsible party. `actorLabel` covers the paths with no logged-in user --
 * the SQS prize consumer and the pending-ownership claim job.
 */
export interface ItemActor {
  actorUserId?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
  staffNote?: string | null;
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly discordService: DiscordService,
    private readonly itemTransactions: ItemTransactionsService,
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
      if (error.code === "P2002") {
        // Unique constraint violation
        throw new ConflictException(
          "An item type with this name already exists in this community",
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
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
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
        orderBy: { createdAt: "desc" },
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
      if (error.code === "P2025") {
        // Record not found
        throw new NotFoundException(`ItemType with ID ${id} not found`);
      }
      if (error.code === "P2002") {
        throw new ConflictException(
          "An item type with this name already exists in this community",
        );
      }
      throw error;
    }
  }

  async deleteItemType(id: string) {
    // Only live items block deletion. Destroyed ones are history, and history
    // is exactly what we promised not to lose -- but it should not keep a
    // retired item type alive forever either.
    const itemCount = await this.db.item.count({
      where: { itemTypeId: id, destroyedAt: null },
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
      if (error.code === "P2025") {
        throw new NotFoundException(`ItemType with ID ${id} not found`);
      }
      throw error;
    }
  }

  // ==================== Item Methods ====================

  /**
   * Grant `quantity` items to a user, as `quantity` separate rows.
   *
   * Can also create items with pending ownership, for a recipient who has not
   * linked the external account yet.
   */
  /**
   * Create N items for a known owner and record the grant, on a given client.
   *
   * The core of {@link grantItem}, extracted so a caller that already has a
   * transaction open -- a shop checkout paying for the item in the same breath
   * -- can grant inside it rather than opening a second one. Everything
   * grantItem does around this (resolving a Discord handle, opening pending
   * ownership) is network work or a different shape entirely, and must stay
   * outside a transaction.
   *
   * `source` lets the ledger say what caused the grant. Without it a shop
   * purchase is indistinguishable from staff handing something over.
   *
   * Returns the ids it created, not the rows. The ids cost nothing -- they are
   * generated here rather than read back, because `createMany` does not return
   * them and the ledger rows need them in the same statement. Whole items are
   * a caller's concern: a checkout grants one item per purchase line and wants
   * none of them back, so re-reading each one with its joins would be a query
   * per unit bought, spent inside the transaction, for nothing.
   */
  async createGranted(
    client: DbClient,
    input: {
      itemTypeId: string;
      communityId: string;
      ownerId: string | null;
      quantity: number;
      metadata?: Prisma.InputJsonValue;
      actor: ItemActor;
      source?: ItemTransactionSource;
      sourceId?: string | null;
    },
  ) {
    // Every item and every ledger row commit together or not at all. A ledger
    // that can disagree with `items` is worse than none: it looks
    // authoritative while being wrong.
    //
    // No stacking, so no read-then-write and no race: N items is N inserts.
    // The ids are generated here rather than read back because createMany does
    // not return them, and the ledger rows need them in the same statement.
    const itemIds = Array.from({ length: input.quantity }, () => randomUUID());

    await client.item.createMany({
      data: itemIds.map((id) => ({
        id,
        itemTypeId: input.itemTypeId,
        ownerId: input.ownerId,
        metadata: input.metadata || {},
      })),
    });

    await this.itemTransactions.recordBatch(
      {
        communityId: input.communityId,
        itemTypeId: input.itemTypeId,
        itemIds,
        kind: ItemTransactionKind.GRANT,
        // Null for a grant still awaiting a claim: nobody holds it yet, and
        // the CLAIM row written later is what names the eventual owner.
        toUserId: input.ownerId,
        source: input.source,
        sourceId: input.sourceId,
        ...input.actor,
      },
      client,
    );

    return itemIds;
  }

  async grantItem(input: {
    itemTypeId: string;
    userId?: string | null; // Optional for orphaned items
    quantity: number;
    metadata?: Prisma.InputJsonValue;
    pendingOwner?: PendingOwnerInput; // For pending ownership
    actor: ItemActor;
  }) {
    const { itemTypeId, userId, quantity, metadata } = input;
    let pendingOwner = input.pendingOwner;

    // VALIDATION: Items must have either an owner or pending owner
    // Unlike characters, items cannot be fully orphaned
    if (!userId && !pendingOwner) {
      throw new BadRequestException(
        "Items must have either an owner or pending owner. Cannot create fully orphaned items.",
      );
    }

    // Determine actual owner: null if pending, otherwise userId
    // Can be reassigned if external account is already claimed
    let actualOwnerId = pendingOwner ? null : userId;

    if (quantity < 1) {
      throw new BadRequestException("Quantity must be at least 1");
    }

    // Get the item type to check if it's stackable
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
    });

    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${itemTypeId} not found`);
    }

    // PRE-VALIDATION: Resolve external account and check if claimed BEFORE creating item
    if (pendingOwner) {
      let resolvedAccountId: string;
      let displayIdentifier: string | undefined;

      // Resolve Discord username to ID if necessary
      if (pendingOwner.provider === ExternalAccountProvider.DISCORD) {
        // Check if the input is already a numeric ID
        const isNumericId = /^\d{17,19}$/.test(pendingOwner.providerAccountId);

        // If it's not an ID (i.e., it's a username), store it as displayIdentifier
        if (!isNumericId) {
          displayIdentifier = pendingOwner.providerAccountId;
        }

        resolvedAccountId = await this.resolveDiscordIdentifier(
          itemType.communityId,
          pendingOwner.providerAccountId,
        );
      } else if (pendingOwner.provider === ExternalAccountProvider.DEVIANTART) {
        // DeviantArt uses usernames, so always store as displayIdentifier
        displayIdentifier = pendingOwner.providerAccountId;
        resolvedAccountId = pendingOwner.providerAccountId;
      } else {
        throw new BadRequestException(
          `Unsupported provider: ${pendingOwner.provider}`,
        );
      }

      // Check if the external account has already been claimed by a user
      // If so, assign directly to that user instead of creating pending ownership
      const claimedUserId =
        await this.pendingOwnershipService.checkIfAccountClaimed(
          pendingOwner.provider,
          resolvedAccountId,
        );

      if (claimedUserId) {
        // Account is already claimed - assign directly to that user
        actualOwnerId = claimedUserId;
        pendingOwner = undefined; // Don't create pending ownership
      } else {
        // Store resolved data for later use
        pendingOwner = {
          ...pendingOwner,
          providerAccountId: resolvedAccountId,
          displayIdentifier,
        };
      }
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

    // Every item and every ledger row commit together or not at all. A ledger
    // that can disagree with `items` is worse than none: it looks authoritative
    // while being wrong.
    //
    // No stacking, so no read-then-write and no race: N items is N inserts.
    const itemIds = await this.db.$transaction((tx) =>
      this.createGranted(tx, {
        itemTypeId,
        communityId: itemType.communityId,
        ownerId: actualOwnerId ?? null,
        quantity,
        metadata,
        actor: input.actor,
      }),
    );

    // Pending ownership is one record per item -- PendingOwnership.itemId is
    // unique, and each instance claims independently.
    if (pendingOwner) {
      for (const itemId of itemIds) {
        await this.pendingOwnershipService.createForItem(
          itemId,
          pendingOwner.provider,
          pendingOwner.providerAccountId, // Already resolved earlier
          pendingOwner.displayIdentifier,
        );
      }
    }

    // One read for the whole grant, and outside the transaction: this exists
    // to answer the caller with whole items, which is not work the write needs
    // to hold a connection open for.
    return this.db.item.findMany({
      where: { id: { in: itemIds } },
      include: {
        itemType: { include: { community: true } },
        owner: true,
      },
      orderBy: { id: "asc" },
    });
  }

  async findAllItems(filters: ItemFilters = {}) {
    const {
      limit = 20,
      offset = 0,
      ownerId,
      itemTypeId,
      communityId,
    } = filters;

    const where: Prisma.ItemWhereInput = {
      AND: [
        // Destroyed items are never inventory. They stay reachable one at a
        // time through provenance, and nowhere else.
        { destroyedAt: null },
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
        orderBy: { createdAt: "desc" },
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

  /**
   * Update one item's instance data. Quantity is gone: an item is one item, so
   * "give them two more" is a grant and "take one back" is a revoke.
   */
  async updateItem(id: string, input: Prisma.ItemUpdateInput) {
    try {
      return await this.db.item.update({
        where: { id },
        data: input,
        include: {
          itemType: { include: { community: true } },
          owner: true,
        },
      });
    } catch (error) {
      if (error.code === "P2025") {
        throw new NotFoundException(`Item with ID ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Revoke items, destroying them.
   *
   * Soft, not hard. A destroyed item keeps its provenance readable, which is
   * exactly the history a dispute wants -- "this locket was revoked for fraud"
   * should stay traceable rather than evaporating with the row. Mirrors how
   * characters are deleted.
   *
   * Takes a list because revoking two of someone's three potions now means
   * naming two specific items, and the whole revoke should land as one event.
   */
  async revokeItems(itemIds: string[], actor: ItemActor) {
    if (itemIds.length === 0) {
      throw new BadRequestException("No items given to revoke");
    }
    return this.db.$transaction((tx) => this.destroyItems(tx, itemIds, actor));
  }

  /**
   * Soft-destroy items and record the revoke, on a given client.
   *
   * The core of {@link revokeItems}, extracted so a caller already inside a
   * transaction -- a shop refund handing back the coin in the same breath --
   * can revoke within it rather than opening a second one.
   */
  async destroyItems(
    client: DbClient,
    itemIds: string[],
    actor: ItemActor,
    source?: ItemTransactionSource,
    sourceId?: string | null,
    /**
     * Refuse unless the items are still held by this user.
     *
     * For callers whose right to destroy depends on who owns the item -- a
     * refund may only take back what the buyer still has -- checking the owner
     * before calling here is not enough, because a trade can land in between.
     * Passed through to the UPDATE itself so the database re-evaluates it
     * under the row lock.
     */
    expectedOwnerId?: string,
  ) {
    const items = await client.item.findMany({
      where: { id: { in: itemIds }, destroyedAt: null },
      include: { itemType: { select: { communityId: true } } },
    });

    if (items.length !== itemIds.length) {
      throw new NotFoundException(
        "One or more of those items does not exist or is already destroyed",
      );
    }

    // A single revoke must not span item types: the ledger row carries the
    // type, and callers that mix them are asking for two events, not one.
    const typeIds = new Set(items.map((i) => i.itemTypeId));
    if (typeIds.size > 1) {
      throw new BadRequestException(
        "All items in one revoke must share an item type",
      );
    }

    const ownerIds = new Set(items.map((i) => i.ownerId));
    if (ownerIds.size > 1) {
      throw new BadRequestException(
        "All items in one revoke must share an owner",
      );
    }

    // The predicate goes in the UPDATE rather than being trusted from the
    // read above. Postgres re-evaluates it after taking each row's lock, so a
    // trade or a second revoke that commits in between makes this match
    // nothing instead of destroying something it no longer should.
    const destroyed = await client.item.updateMany({
      where: {
        id: { in: itemIds },
        destroyedAt: null,
        ...(expectedOwnerId === undefined ? {} : { ownerId: expectedOwnerId }),
      },
      data: {
        destroyedAt: new Date(),
        destroyedById: actor.actorUserId ?? null,
      },
    });

    if (destroyed.count !== itemIds.length) {
      throw new ConflictException(
        "Those items changed hands or were destroyed while this was running",
      );
    }

    await this.itemTransactions.recordBatch(
      {
        communityId: items[0].itemType.communityId,
        itemTypeId: items[0].itemTypeId,
        itemIds,
        kind: ItemTransactionKind.REVOKE,
        fromUserId: items[0].ownerId,
        source,
        sourceId,
        ...actor,
      },
      client,
    );

    return items.length;
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
      // Validate the numeric ID exists in Discord
      const isValid = await this.discordService.validateUserId(identifier);
      if (!isValid) {
        throw new NotFoundException(
          `Discord user with ID "${identifier}" not found. Please verify the ID is correct.`,
        );
      }
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

  /**
   * Circulation, holders and recent movement for every item type in a
   * community.
   *
   * Four reads rather than one aggregate query, because the numbers come from
   * three tables and two of them need a distinct count that Prisma's groupBy
   * cannot express. Live items are fetched rather than counted so holders and
   * circulation come off the same pass; the set is bounded by what one
   * community has minted, which is small.
   */
  async findItemEconomy(communityId: string) {
    const RECENT_DAYS = 30;
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);

    const [types, liveItems, recentMovement, unclaimedRows] = await Promise.all(
      [
        this.db.itemType.findMany({ where: { communityId } }),
        this.db.item.findMany({
          where: { destroyedAt: null, itemType: { communityId } },
          select: { itemTypeId: true, ownerId: true },
        }),
        this.db.itemTransaction.groupBy({
          by: ["itemTypeId", "kind"],
          where: { communityId, createdAt: { gte: since } },
          _count: { _all: true },
        }),
        this.db.pendingOwnership.findMany({
          where: {
            claimedAt: null,
            item: { destroyedAt: null, itemType: { communityId } },
          },
          select: { item: { select: { itemTypeId: true } } },
        }),
      ],
    );

    const circulation = new Map<string, number>();
    const holders = new Map<string, Set<string>>();
    const everyHolder = new Set<string>();

    for (const item of liveItems) {
      circulation.set(
        item.itemTypeId,
        (circulation.get(item.itemTypeId) ?? 0) + 1,
      );
      if (!item.ownerId) continue;
      // An unclaimed item has no owner, so it counts toward circulation but
      // toward nobody's holdings.
      const set = holders.get(item.itemTypeId) ?? new Set<string>();
      set.add(item.ownerId);
      holders.set(item.itemTypeId, set);
      everyHolder.add(item.ownerId);
    }

    const movement = new Map<string, { granted: number; revoked: number }>();
    for (const row of recentMovement) {
      const entry = movement.get(row.itemTypeId) ?? { granted: 0, revoked: 0 };
      if (row.kind === ItemTransactionKind.GRANT)
        entry.granted += row._count._all;
      else if (row.kind === ItemTransactionKind.REVOKE)
        entry.revoked += row._count._all;
      movement.set(row.itemTypeId, entry);
    }

    const unclaimed = new Map<string, number>();
    for (const row of unclaimedRows) {
      const id = row.item?.itemTypeId;
      if (!id) continue;
      unclaimed.set(id, (unclaimed.get(id) ?? 0) + 1);
    }

    const itemTypes = types
      .map((itemType) => ({
        itemType,
        circulation: circulation.get(itemType.id) ?? 0,
        holderCount: holders.get(itemType.id)?.size ?? 0,
        grantedRecently: movement.get(itemType.id)?.granted ?? 0,
        revokedRecently: movement.get(itemType.id)?.revoked ?? 0,
        unclaimed: unclaimed.get(itemType.id) ?? 0,
      }))
      // Biggest first: that is the order someone scans for anomalies.
      .sort((a, b) => b.circulation - a.circulation);

    const netRecently = itemTypes.reduce(
      (n, t) => n + t.grantedRecently - t.revokedRecently,
      0,
    );

    return {
      totalCirculation: liveItems.length,
      totalHolders: everyHolder.size,
      totalUnclaimed: unclaimedRows.length,
      netRecently,
      itemTypes,
    };
  }

  /**
   * One member's live holdings in one community, grouped by item type.
   *
   * Deliberately unpaginated. An inventory is a whole thing -- a page that
   * silently shows the first 20 of someone's 30 items is worse than one that
   * takes an extra moment, and the count beside it would be a lie. The set is
   * bounded by what one person holds in one community.
   *
   * This exists rather than reusing `User.inventories` because that field
   * resolver calls `findAllItems` without a limit and so takes the default of
   * 20, then reports `totalItems` as the length of the truncated array. Nothing
   * about the result says it was cut short.
   */
  async findMemberHoldings(userId: string, communityId: string) {
    const [member, items, pendingItems] = await Promise.all([
      this.db.user.findUnique({ where: { id: userId } }),
      this.db.item.findMany({
        where: {
          ownerId: userId,
          destroyedAt: null,
          itemType: { communityId },
        },
        include: { itemType: true },
        orderBy: { createdAt: "asc" },
      }),
      this.db.pendingOwnership.count({
        where: {
          claimedAt: null,
          claimedByUserId: userId,
          item: { destroyedAt: null, itemType: { communityId } },
        },
      }),
    ]);

    if (!member) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const byType = new Map<
      string,
      { itemType: (typeof items)[number]["itemType"]; items: typeof items }
    >();

    for (const item of items) {
      const group = byType.get(item.itemTypeId);
      if (group) group.items.push(item);
      else
        byType.set(item.itemTypeId, { itemType: item.itemType, items: [item] });
    }

    const holdings = [...byType.values()]
      .map((g) => ({
        itemType: g.itemType,
        count: g.items.length,
        items: g.items,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      member,
      totalItems: items.length,
      distinctTypes: holdings.length,
      pendingItems,
      holdings,
    };
  }
}
