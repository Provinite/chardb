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
  CurrencyTransactionSource,
  ItemTransactionKind,
  ItemTransactionSource,
  NotificationKind,
  NotificationSubjectType,
} from "@chardb/database";
import {
  ItemTransactionsService,
  type DbClient,
} from "../item-transactions/item-transactions.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CurrencyLedgerService } from "../currencies/currency-ledger.service";
import { ItemTypeFilters } from "./dto/item-type.dto";
import { ItemFilters, MAX_GRANT_QUANTITY } from "./dto/item.dto";

/** The ceiling every other currency amount in the app carries. */
const MAX_PAYOUT_AMOUNT = 1_000_000_000;

/**
 * The things an item type can do when used, named as staff see them.
 *
 * Exactly one per item type. The strings are user-facing -- they land in the
 * refusal a staff member reads when they try to configure a second.
 */
type UseEffectKind = "payout" | "MYO grant" | "edit kit grant";

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

/**
 * The optional half of destroying items.
 *
 * An options object rather than five trailing positionals: callers were
 * already writing `undefined, null, "user1"` to reach the one they wanted,
 * which is a signature that tells the reader nothing about what it is doing.
 */
export interface DestroyItemsOptions {
  source?: ItemTransactionSource;
  sourceId?: string | null;
  /**
   * Refuse unless the items are still held by this user.
   *
   * For callers whose right to destroy depends on who owns the item -- a
   * refund may only take back what the buyer still has -- checking the owner
   * before calling here is not enough, because a trade can land in between.
   * Passed through to the UPDATE itself so the database re-evaluates it
   * under the row lock.
   */
  expectedOwnerId?: string;
  /**
   * Why the item is gone. Defaults to REVOKE, which is staff taking it back.
   * A holder using one up is a USE, and the difference is the whole of what
   * the provenance page can tell a reader about what happened to it.
   */
  kind?: ItemTransactionKind;
  /**
   * Share a batch id with whatever else this destruction is part of.
   *
   * Using an item writes to two ledgers -- the item is destroyed, the coin is
   * created -- and the pair is only recognisable as one event if both carry
   * the same id.
   */
  batchId?: string;
}

@Injectable()
export class ItemsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly discordService: DiscordService,
    private readonly itemTransactions: ItemTransactionsService,
    private readonly notifications: NotificationsService,
    private readonly currencyLedger: CurrencyLedgerService,
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

  /**
   * Set, replace, or clear what using one of these pays out.
   *
   * Replaces wholesale rather than merging. A payout is read as a set -- "this
   * ticket is worth 100 coin" -- and a partial update would leave staff
   * guessing whether a currency they did not mention is still in there.
   *
   * An empty list clears it, which is how a payout is removed. There is no
   * separate delete: "pays nothing" and "has no payout" are the same state,
   * and two ways to reach it would be two things to keep in step.
   */
  async setItemTypePayout(
    itemTypeId: string,
    components: Array<{ currencyId: string; amount: number }>,
  ) {
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
      select: { id: true, name: true, communityId: true, isConsumable: true },
    });
    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${itemTypeId} not found`);
    }

    if (components.length === 0) {
      await this.db.itemUsePayout.deleteMany({ where: { itemTypeId } });
      return this.findItemTypeById(itemTypeId);
    }

    // Consumable is what makes using destroy the item, and destroying it is
    // the only thing stopping a payout being pressed forever. Refused here
    // rather than at use, so staff find out when they are configuring it
    // instead of a member finding out when it does not work.
    if (!itemType.isConsumable) {
      throw new BadRequestException(
        `${itemType.name} is not consumable, so using it would not use it up. A payout needs a consumable item.`,
      );
    }

    await this.refuseSecondUseEffect(itemTypeId, "payout", itemType.name);

    const ids = components.map((c) => c.currencyId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        "A payout names the same currency twice. Say the total once instead.",
      );
    }
    // The bound lives here as well as on the DTO, because the DTO's is the
    // one that used to not run: a bare `@Args` array is skipped by Nest's
    // ValidationPipe entirely. Wrapping the input fixed that, and this stays
    // so the rule does not depend on remembering why the wrapper exists.
    if (
      components.some(
        (c) =>
          !Number.isInteger(c.amount) ||
          c.amount <= 0 ||
          c.amount > MAX_PAYOUT_AMOUNT,
      )
    ) {
      throw new BadRequestException(
        `A payout must pay a whole amount between 1 and ${MAX_PAYOUT_AMOUNT.toLocaleString()}`,
      );
    }

    // The same two checks the shop makes on a price, for the same two
    // reasons: paying another community's coin is the cross-community hole,
    // and an archived currency cannot be created, so a payout naming one would
    // render as a reward that never arrives.
    const currencies = await this.db.currency.findMany({
      where: { id: { in: ids } },
      select: { id: true, communityId: true, archivedAt: true, name: true },
    });
    for (const id of ids) {
      const currency = currencies.find((c) => c.id === id);
      if (!currency || currency.communityId !== itemType.communityId) {
        throw new BadRequestException(
          "A payout names a currency from another community",
        );
      }
      if (currency.archivedAt) {
        throw new BadRequestException(
          `${currency.name} is archived and cannot be paid out`,
        );
      }
    }

    await this.db.$transaction(async (tx) => {
      await tx.itemUsePayout.deleteMany({ where: { itemTypeId } });
      await tx.itemUsePayout.create({
        data: {
          itemTypeId,
          components: { create: components },
        },
      });
    });

    return this.findItemTypeById(itemTypeId);
  }

  /** What using one of these pays, or an empty list when it pays nothing. */
  async findItemTypePayout(itemTypeId: string) {
    const payout = await this.db.itemUsePayout.findUnique({
      where: { itemTypeId },
      include: { components: { include: { currency: true } } },
    });
    return payout?.components ?? [];
  }

  /**
   * Refuse configuring one use effect on a type that already carries another.
   *
   * An item type does one thing when used. Several effects would mean a
   * confirm dialog with several answers and, worse, several different moments
   * of consumption: a payout is spent by pressing Use, an MYO ticket by
   * submitting the character it makes, an edit kit by submitting a change to
   * one. Refused where staff can see it rather than at redemption in front of
   * a member.
   *
   * Every setter calls this, and it checks every *other* effect rather than
   * one named counterpart. Adding the third effect to a pairwise check would
   * have meant three call sites each knowing about two others, which is
   * exactly the arrangement where the fourth gets forgotten in one of them.
   */
  private async refuseSecondUseEffect(
    itemTypeId: string,
    configuring: UseEffectKind,
    itemTypeName: string,
  ) {
    const counts: Array<[UseEffectKind, number]> = [
      ["payout", await this.db.itemUsePayout.count({ where: { itemTypeId } })],
      [
        "MYO grant",
        await this.db.itemUseMyoGrant.count({ where: { itemTypeId } }),
      ],
      [
        "edit kit grant",
        await this.db.itemUseTraitEditGrant.count({ where: { itemTypeId } }),
      ],
    ];

    const other = counts.find(([kind, n]) => kind !== configuring && n > 0);
    if (other) {
      throw new BadRequestException(
        `${itemTypeName} already has a ${other[0]}, and an item type does one thing when used. Clear the ${other[0]} first.`,
      );
    }
  }

  /**
   * Set, replace, or clear which characters a ticket of this type can make.
   *
   * Wholesale, like the payout it mirrors, and for the same reason: a grant
   * reads as a set -- "this ticket makes a Common or an Uncommon" -- and a
   * partial update would leave staff guessing what a variant they did not
   * mention still does.
   *
   * An empty variant list clears the grant. "Makes nothing" and "has no grant"
   * are the same state, and two ways to reach it would be two things to keep
   * in step.
   */
  async setItemTypeMyoGrant(
    itemTypeId: string,
    speciesId: string | null,
    speciesVariantIds: string[],
  ) {
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
      select: { id: true, name: true, communityId: true, isConsumable: true },
    });
    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${itemTypeId} not found`);
    }

    if (speciesVariantIds.length === 0) {
      await this.db.itemUseMyoGrant.deleteMany({ where: { itemTypeId } });
      return this.findItemTypeById(itemTypeId);
    }

    if (!speciesId) {
      throw new BadRequestException(
        "An MYO grant needs a species. Say which one the ticket makes.",
      );
    }

    // Same rule the payout follows, for the same reason: redeeming is what
    // uses the ticket up, and a ticket that survives redemption makes a
    // character every time it is pressed.
    if (!itemType.isConsumable) {
      throw new BadRequestException(
        `${itemType.name} is not consumable, so redeeming it would not use it up. An MYO grant needs a consumable item.`,
      );
    }

    await this.refuseSecondUseEffect(itemTypeId, "MYO grant", itemType.name);

    const ids = [...new Set(speciesVariantIds)];
    if (ids.length !== speciesVariantIds.length) {
      throw new BadRequestException(
        "An MYO grant lists the same variant twice. Listing it again does not make it likelier.",
      );
    }

    // The cross-community hole, closed in both directions: the species has to
    // belong to the item type's community, and every variant has to belong to
    // that species. Without the second, a ticket for a Common Foo could make a
    // Rare Bar.
    const species = await this.db.species.findUnique({
      where: { id: speciesId },
      select: { id: true, name: true, communityId: true },
    });
    if (!species || species.communityId !== itemType.communityId) {
      throw new BadRequestException(
        "An MYO grant names a species from another community",
      );
    }

    const variants = await this.db.speciesVariant.findMany({
      where: { id: { in: ids } },
      select: { id: true, speciesId: true },
    });
    if (
      variants.length !== ids.length ||
      variants.some((v) => v.speciesId !== speciesId)
    ) {
      throw new BadRequestException(
        `An MYO grant names a variant that is not a ${species.name}`,
      );
    }

    await this.db.$transaction(async (tx) => {
      await tx.itemUseMyoGrant.deleteMany({ where: { itemTypeId } });
      await tx.itemUseMyoGrant.create({
        data: {
          itemTypeId,
          speciesId,
          variants: { create: ids.map((id) => ({ speciesVariantId: id })) },
        },
      });
    });

    return this.findItemTypeById(itemTypeId);
  }

  /** What a ticket of this type makes, or null when it makes nothing. */
  async findItemTypeMyoGrant(itemTypeId: string) {
    return this.db.itemUseMyoGrant.findUnique({
      where: { itemTypeId },
      include: {
        species: true,
        variants: { include: { speciesVariant: true } },
      },
    });
  }

  /**
   * Set, replace, or clear which characters an edit kit of this type can
   * change the traits of.
   *
   * Wholesale, like the other two effects. A kit reads as a set -- "this kit
   * edits any Thornwing, or a Rare Bramblecat" -- and a partial update would
   * leave staff guessing what a species they did not mention still covers.
   *
   * **A species with no variants listed covers every variant of it**,
   * including a character with no variant set at all. That is the ordinary
   * thing to sell, so it is the state you get by naming a species and
   * stopping. Listing variants narrows it.
   *
   * An empty species list clears the grant.
   */
  async setItemTypeTraitEditGrant(
    itemTypeId: string,
    species: Array<{ speciesId: string; speciesVariantIds: string[] }>,
  ) {
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
      select: { id: true, name: true, communityId: true, isConsumable: true },
    });
    if (!itemType) {
      throw new NotFoundException(`ItemType with ID ${itemTypeId} not found`);
    }

    if (species.length === 0) {
      await this.db.itemUseTraitEditGrant.deleteMany({ where: { itemTypeId } });
      return this.findItemTypeById(itemTypeId);
    }

    // Same rule the other two follow: spending is what uses the kit up, and a
    // kit that survived being spent would buy an edit every time.
    if (!itemType.isConsumable) {
      throw new BadRequestException(
        `${itemType.name} is not consumable, so spending it would not use it up. An edit kit grant needs a consumable item.`,
      );
    }

    await this.refuseSecondUseEffect(
      itemTypeId,
      "edit kit grant",
      itemType.name,
    );

    const speciesIds = species.map((s) => s.speciesId);
    if (new Set(speciesIds).size !== speciesIds.length) {
      throw new BadRequestException(
        "An edit kit grant names the same species twice. Say its variants once instead.",
      );
    }

    // The cross-community hole, closed in both directions: every species must
    // belong to the item type's community, and every variant to the species
    // it is listed under.
    const rows = await this.db.species.findMany({
      where: { id: { in: speciesIds } },
      select: { id: true, name: true, communityId: true },
    });
    for (const s of species) {
      const found = rows.find((r) => r.id === s.speciesId);
      if (!found || found.communityId !== itemType.communityId) {
        throw new BadRequestException(
          "An edit kit grant names a species from another community",
        );
      }

      const variantIds = [...new Set(s.speciesVariantIds)];
      if (variantIds.length !== s.speciesVariantIds.length) {
        throw new BadRequestException(
          "An edit kit grant names the same variant twice",
        );
      }
      if (variantIds.length === 0) continue;

      const variants = await this.db.speciesVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, speciesId: true },
      });
      if (
        variants.length !== variantIds.length ||
        variants.some((v) => v.speciesId !== s.speciesId)
      ) {
        throw new BadRequestException(
          `An edit kit grant names a variant that is not a ${found.name}`,
        );
      }
    }

    await this.db.$transaction(async (tx) => {
      await tx.itemUseTraitEditGrant.deleteMany({ where: { itemTypeId } });
      await tx.itemUseTraitEditGrant.create({
        data: {
          itemTypeId,
          species: {
            create: species.map((s) => ({
              speciesId: s.speciesId,
              variants: {
                create: [...new Set(s.speciesVariantIds)].map((id) => ({
                  speciesVariantId: id,
                })),
              },
            })),
          },
        },
      });
    });

    return this.findItemTypeById(itemTypeId);
  }

  /** What an edit kit of this type covers, or null when it covers nothing. */
  async findItemTypeTraitEditGrant(itemTypeId: string) {
    return this.db.itemUseTraitEditGrant.findUnique({
      where: { itemTypeId },
      include: {
        species: {
          include: {
            species: true,
            variants: { include: { speciesVariant: true } },
          },
        },
      },
    });
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

    // Also checked here, not only on GrantItemInput. The Discord prize queue
    // calls this service directly and its own message DTO has no maximum at
    // all, so a cap that lived on the GraphQL input would leave the one
    // unbounded caller unbounded -- and it is the expensive one, since a
    // pending-owner grant writes a claim row per item.
    if (quantity > MAX_GRANT_QUANTITY) {
      throw new BadRequestException(
        `Cannot grant more than ${MAX_GRANT_QUANTITY} at once`,
      );
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
    const itemIds = await this.db.$transaction(async (tx) => {
      const ids = await this.createGranted(tx, {
        itemTypeId,
        communityId: itemType.communityId,
        ownerId: actualOwnerId ?? null,
        quantity,
        metadata,
        actor: input.actor,
      });

      // A grant of five identical potions is one notification saying five, not
      // five notifications. Nothing is sent for a grant still awaiting a claim:
      // there is no one to tell until the CLAIM names an owner.
      //
      // Here rather than in createGranted, so that buying something does not
      // notify the buyer that they received it. A shop purchase is already the
      // most direct possible confirmation of itself.
      if (actualOwnerId) {
        await this.notifications.create(
          {
            recipientId: actualOwnerId,
            kind: NotificationKind.ITEM_GRANTED,
            communityId: itemType.communityId,
            subjectType: NotificationSubjectType.ITEM,
            subjectId: ids[0],
            data: { subjectName: itemType.name.slice(0, 200), count: quantity },
            ...input.actor,
          },
          tx,
        );
      }

      return ids;
    });

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
  /**
   * Spend one of your items and take what it pays.
   *
   * Destroying and paying happen in one transaction under one batch id, so the
   * item ledger's USE row and the currency ledger's credit are recognisable as
   * two halves of one event rather than two things that happened to coincide.
   *
   * The ownership predicate rides in the UPDATE rather than being trusted from
   * the read, which is what makes a double-click safe: the second one destroys
   * nothing, fails, and pays nothing. Getting this wrong on a feature that
   * creates currency is the difference between a bug and a mint.
   *
   * Every check the admin form already made is made again here, because none
   * of them stay true on their own -- staff can archive the currency, or clear
   * the payout, between the button rendering and the press landing.
   */
  async useItem(itemId: string, userId: string) {
    const item = await this.loadUsableItem(itemId, userId);

    // What this item type actually does.
    const effect = await this.resolveUseEffect(item.itemType, userId);

    // Both of the other effects need input this mutation has no way to carry
    // -- which variant, what name, which traits, which character -- and
    // produce something other than a payout. Each has its own mutation, which
    // destroys the item itself on the same terms.
    //
    // Refused rather than quietly no-op'd: an API caller that reached here
    // meant to spend something, and the item is still theirs afterwards.
    if (effect.kind === "MYO") {
      throw new BadRequestException(
        `${item.itemType.name} is redeemed by making a character with it, not by using it from your inventory`,
      );
    }
    if (effect.kind === "TRAIT_EDIT") {
      throw new BadRequestException(
        `${item.itemType.name} is spent by editing a character's traits with it, not by using it from your inventory`,
      );
    }

    const batchId = randomUUID();

    return this.db.$transaction(async (tx) => {
      // Destroyed first, and conditionally on still being this member's, so
      // the effect only ever runs for a use that actually consumed something.
      // A second click destroys nothing, throws, and applies nothing -- which
      // on a feature that creates currency is the difference between a bug
      // and a mint.
      await this.destroyItems(
        tx,
        [itemId],
        { actorUserId: userId, reason: `Used ${item.itemType.name}` },
        {
          kind: ItemTransactionKind.USE,
          expectedOwnerId: userId,
          batchId,
        },
      );

      const payout = await this.applyCurrencyPayout(tx, effect.payout, {
        userId,
        itemId,
        itemTypeName: item.itemType.name,
        batchId,
      });

      return { itemTypeName: item.itemType.name, batchId, payout };
    });
  }

  /**
   * Read an item somebody is about to spend, and refuse if they cannot.
   *
   * Shared by using and by MYO redemption, which destroy the same way and for
   * the same reasons. None of these checks is the safety net -- the ownership
   * predicate in the destroy is -- but refusing here means the caller gets a
   * sentence rather than a conflict.
   */
  private async loadUsableItem(itemId: string, userId: string) {
    const item = await this.db.item.findFirst({
      where: { id: itemId, destroyedAt: null },
      include: {
        itemType: {
          include: {
            usePayout: {
              include: { components: { include: { currency: true } } },
            },
            useMyoGrant: {
              include: {
                species: true,
                variants: { include: { speciesVariant: true } },
              },
            },
            useTraitEditGrant: {
              include: {
                species: {
                  include: {
                    species: true,
                    variants: { include: { speciesVariant: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(
        "That item does not exist, or is already gone",
      );
    }
    if (item.ownerId !== userId) {
      throw new BadRequestException("That item is not yours to use");
    }
    if (!item.itemType.isConsumable) {
      throw new BadRequestException(`${item.itemType.name} cannot be used`);
    }

    return item;
  }

  /**
   * Everything an MYO redemption needs, with every reason to refuse spent.
   *
   * Public because redeeming lives in MyoService: the item rules belong here,
   * beside the destroy that enforces them, and the character rules belong
   * there. Returns before anything is written -- the caller opens the
   * transaction.
   */
  async resolveMyoRedemption(itemId: string, userId: string) {
    const item = await this.loadUsableItem(itemId, userId);
    const effect = await this.resolveUseEffect(item.itemType, userId);

    if (effect.kind !== "MYO") {
      throw new BadRequestException(
        `${item.itemType.name} does not make characters`,
      );
    }

    return { item, itemType: item.itemType, grant: effect.grant };
  }

  /**
   * Everything an edit-kit redemption needs, with every item-side reason to
   * refuse spent.
   *
   * Public for the same reason {@link resolveMyoRedemption} is: the item rules
   * belong here beside the destroy that enforces them, and the character rules
   * belong in EditKitsService. Returns before anything is written.
   */
  async resolveTraitEditRedemption(itemId: string, userId: string) {
    const item = await this.loadUsableItem(itemId, userId);
    const effect = await this.resolveUseEffect(item.itemType, userId);

    if (effect.kind !== "TRAIT_EDIT") {
      throw new BadRequestException(
        `${item.itemType.name} does not edit character traits`,
      );
    }

    return { item, itemType: item.itemType, grant: effect.grant };
  }

  /**
   * Whether an edit kit's grant covers this character.
   *
   * A species with no variants listed covers every variant of it, and a
   * character with no variant set at all -- that last case is the one a
   * variant-list check gets wrong by omission, so it is spelled out rather
   * than falling out of a comparison.
   */
  static traitEditGrantCovers(
    grant: {
      species: Array<{
        speciesId: string;
        variants: Array<{ speciesVariantId: string }>;
      }>;
    },
    character: { speciesId: string | null; speciesVariantId: string | null },
  ): boolean {
    if (!character.speciesId) return false;

    const entry = grant.species.find(
      (s) => s.speciesId === character.speciesId,
    );
    if (!entry) return false;

    // No variants listed means every variant, including none.
    if (entry.variants.length === 0) return true;

    return entry.variants.some(
      (v) => v.speciesVariantId === character.speciesVariantId,
    );
  }

  /**
   * Work out what using this type does, and refuse now if it cannot.
   *
   * Everything here was already checked when staff configured the effect. It
   * is checked again because none of it stays true on its own: a currency can
   * be archived, or the payout cleared, between the button rendering and the
   * press landing. Same reason a trade re-checks its lines at settlement.
   *
   * A discriminated union rather than an optional field per effect, so a
   * caller cannot forget to ask which one it got. The two are mutually
   * exclusive at configuration time; this is where that pays off.
   */
  private async resolveUseEffect(
    itemType: Prisma.ItemTypeGetPayload<{
      include: {
        usePayout: { include: { components: { include: { currency: true } } } };
        useMyoGrant: {
          include: {
            species: true;
            variants: { include: { speciesVariant: true } };
          };
        };
        useTraitEditGrant: {
          include: {
            species: {
              include: {
                species: true;
                variants: { include: { speciesVariant: true } };
              };
            };
          };
        };
      };
    }>,
    userId: string,
  ) {
    // Membership first, and for both effects. Coin only exists inside a
    // community for its members, and neither does a species. Checked before
    // anything is destroyed, so a non-member is refused rather than left with
    // neither the item nor what it was for.
    const membership = await this.db.communityMember.count({
      where: { userId, role: { communityId: itemType.communityId } },
    });
    if (membership === 0) {
      throw new BadRequestException(
        "You must be a member of this community to use that",
      );
    }

    const grant = itemType.useMyoGrant;
    if (grant) {
      if (grant.variants.length === 0) {
        throw new BadRequestException(`${itemType.name} does nothing yet`);
      }
      return { kind: "MYO" as const, grant };
    }

    const editGrant = itemType.useTraitEditGrant;
    if (editGrant) {
      if (editGrant.species.length === 0) {
        throw new BadRequestException(`${itemType.name} does nothing yet`);
      }
      return { kind: "TRAIT_EDIT" as const, grant: editGrant };
    }

    const payout = itemType.usePayout?.components ?? [];

    if (payout.length === 0) {
      // Consumable but doing nothing. Using it would destroy the item and
      // give the holder nothing, which is worth refusing rather than doing
      // quietly.
      throw new BadRequestException(`${itemType.name} does nothing yet`);
    }

    const archived = payout.find((c) => c.currency.archivedAt);
    if (archived) {
      throw new BadRequestException(
        `${archived.currency.name} is archived, so ${itemType.name} cannot be used right now`,
      );
    }

    return { kind: "CURRENCY" as const, payout };
  }

  /** Pay a use's currency components, on the use's transaction and batch. */
  private async applyCurrencyPayout(
    tx: Prisma.TransactionClient,
    components: Prisma.ItemUsePayoutComponentGetPayload<{
      include: { currency: true };
    }>[],
    context: {
      userId: string;
      itemId: string;
      itemTypeName: string;
      batchId: string;
    },
  ) {
    for (const component of components) {
      await this.currencyLedger.credit({
        currencyId: component.currencyId,
        awards: [{ userId: context.userId, amount: component.amount }],
        reason: `Used ${context.itemTypeName}`,
        actorUserId: context.userId,
        source: CurrencyTransactionSource.ITEM_USE,
        // The item, not its type: it is the thing destroyed to produce this
        // coin, and the USE row on the other ledger names it too.
        sourceId: context.itemId,
        tx,
        batchId: context.batchId,
      });
    }

    return components.map((c) => ({
      id: c.id,
      currency: c.currency,
      amount: c.amount,
    }));
  }

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
  /**
   * @see DestroyItemsOptions
   */
  async destroyItems(
    client: DbClient,
    itemIds: string[],
    actor: ItemActor,
    options: DestroyItemsOptions = {},
  ) {
    const {
      source,
      sourceId,
      expectedOwnerId,
      kind = ItemTransactionKind.REVOKE,
      batchId,
    } = options;
    const items = await client.item.findMany({
      where: { id: { in: itemIds }, destroyedAt: null },
      // `name` is here for the revoke notification, which needs something to
      // call the thing it is telling somebody about.
      include: { itemType: { select: { communityId: true, name: true } } },
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
        kind,
        fromUserId: items[0].ownerId,
        source,
        sourceId,
        batchId,
        ...actor,
      },
      client,
    );

    // One notification for the whole revoke, matching the single ledger event.
    // `reason` is the member-facing half of ItemActor, so a revoke that
    // explained itself to the ledger explains itself here too. An unclaimed
    // item has no owner to tell.
    //
    // Nobody is told about their own doing: a member undoing their own shop
    // purchase does not need to be informed that their item was taken away.
    // Staff revoking, or staff refunding on somebody's behalf, still does.
    const selfInflicted = actor.actorUserId === items[0].ownerId;
    if (items[0].ownerId && !selfInflicted) {
      await this.notifications.create(
        {
          recipientId: items[0].ownerId,
          kind: NotificationKind.ITEM_REVOKED,
          communityId: items[0].itemType.communityId,
          subjectType: NotificationSubjectType.ITEM,
          subjectId: items[0].id,
          data: {
            subjectName: items[0].itemType.name.slice(0, 200),
            count: items.length,
            reason: actor.reason?.slice(0, 500) ?? null,
          },
          ...actor,
        },
        client,
      );
    }

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
