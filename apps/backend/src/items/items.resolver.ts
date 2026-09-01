import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { mapPrismaCurrencyToGraphQL } from "../currencies/utils/currency-resolver-mappers";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { ItemsService } from "./items.service";
import { CommunitiesService } from "../communities/communities.service";
import { UsersService } from "../users/users.service";
import { CommunityColorsService } from "../community-colors/community-colors.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { PendingOwnership } from "../pending-ownership/entities/pending-ownership.entity";
import { mapPrismaPendingOwnershipToGraphQL } from "../pending-ownership/utils/pending-ownership-mappers";
import {
  ItemType as ItemTypeEntity,
  ItemTypeConnection,
  ItemUsePayoutComponent,
  UseItemResult,
} from "./entities/item-type.entity";
import { Item as ItemEntity } from "./entities/item.entity";
import { ItemEconomyReport } from "./entities/item-economy.entity";
import { MemberHoldingsReport } from "./entities/member-holdings.entity";
import { Community } from "../communities/entities/community.entity";
import { Image } from "../images/entities/image.entity";
import { User } from "../users/entities/user.entity";
import { DatabaseService } from "../database/database.service";
import { mapPrismaImageToGraphQL } from "../images/utils/image-resolver-mappers";
import { CommunityColor } from "../community-colors/entities/community-color.entity";
import {
  CreateItemTypeInput,
  UpdateItemTypeInput,
  ItemTypeFiltersInput,
  ItemUsePayoutComponentInput,
  UseItemInput,
} from "./dto/item-type.dto";
import { GrantItemInput, UpdateItemInput } from "./dto/item.dto";
import {
  mapPrismaItemTypeConnectionToGraphQL,
  mapPrismaItemTypeToGraphQL,
} from "./utils/item-type-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaItemToGraphQL } from "./utils/item-resolver-mappers";

@Resolver(() => ItemTypeEntity)
export class ItemsResolver {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly communitiesService: CommunitiesService,
    private readonly usersService: UsersService,
    private readonly communityColorsService: CommunityColorsService,
    private readonly pendingOwnershipService: PendingOwnershipService,
    private readonly database: DatabaseService,
  ) {}

  // ==================== ItemType Mutations ====================

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => ItemTypeEntity)
  async createItemType(
    @Args("input") input: CreateItemTypeInput,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.createItemType({
      name: input.name,
      description: input.description,
      category: input.category,
      isTradeable: input.isTradeable ?? true,
      isConsumable: input.isConsumable ?? false,
      image: input.imageId ? { connect: { id: input.imageId } } : undefined,
      color: input.colorId ? { connect: { id: input.colorId } } : undefined,
      metadata: input.metadata || {},
      community: {
        connect: { id: input.communityId },
      },
    });

    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: "id" })
  @Mutation(() => ItemTypeEntity)
  async updateItemType(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateItemTypeInput,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.updateItemType(id, {
      name: input.name,
      description: input.description,
      category: input.category,
      isTradeable: input.isTradeable,
      isConsumable: input.isConsumable,
      image:
        input.imageId !== undefined
          ? input.imageId
            ? { connect: { id: input.imageId } }
            : { disconnect: true }
          : undefined,
      color:
        input.colorId !== undefined
          ? input.colorId
            ? { connect: { id: input.colorId } }
            : { disconnect: true }
          : undefined,
      metadata: input.metadata,
    });

    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: "id" })
  @Mutation(() => Boolean)
  async deleteItemType(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.itemsService.deleteItemType(id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ itemTypeId: "itemTypeId" })
  @Mutation(() => ItemTypeEntity, {
    description:
      "Set what using one of these pays its holder. Replaces the payout " +
      "wholesale; an empty list clears it. Needs the same permission as " +
      "editing the item type, because it is minting rights.",
  })
  async setItemTypeUsePayout(
    @Args("itemTypeId", { type: () => ID }) itemTypeId: string,
    @Args("components", { type: () => [ItemUsePayoutComponentInput] })
    components: ItemUsePayoutComponentInput[],
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.setItemTypePayout(
      itemTypeId,
      components,
    );
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  // ==================== ItemType Queries ====================

  @AllowUnauthenticated()
  @Query(() => ItemTypeConnection)
  async itemTypes(
    @Args("filters", { nullable: true }) filters?: ItemTypeFiltersInput,
  ): Promise<ItemTypeConnection> {
    const items = await this.itemsService.findAllItemTypes(filters);
    return mapPrismaItemTypeConnectionToGraphQL(items);
  }

  @AllowUnauthenticated()
  @Query(() => ItemTypeEntity)
  async itemType(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.findItemTypeById(id);
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  // ==================== Item Queries ====================

  /**
   * Membership only, matching `itemProvenance`: an item's history is public
   * within its community so it can act as a trust signal before a trade, and a
   * history page is no use without the item it belongs to.
   *
   * Destroyed items are returned deliberately. They are excluded from
   * inventories, but their page has to keep working -- that is the whole point
   * of revoking softly.
   */
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ itemId: "id" })
  @Query(() => ItemEntity, {
    name: "item",
    description:
      "One item, including a destroyed one. Readable by any member of the " +
      "community that owns its type.",
  })
  async item(@Args("id", { type: () => ID }) id: string): Promise<ItemEntity> {
    const item = await this.itemsService.findItemById(id);
    return mapPrismaItemToGraphQL(item);
  }

  /**
   * Gated on canManageItems: this is the catalogue owner's view of whether the
   * catalogue is healthy, not the granter's queue.
   */
  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => ItemEconomyReport, {
    name: "itemEconomy",
    description:
      "Circulation, holders and recent movement for every item type in a " +
      "community, largest first.",
  })
  async itemEconomy(
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<ItemEconomyReport> {
    const report = await this.itemsService.findItemEconomy(communityId);
    return {
      ...report,
      itemTypes: report.itemTypes.map((t) => ({
        ...t,
        itemType: mapPrismaItemTypeToGraphQL(t.itemType),
      })),
    };
  }

  /**
   * Membership only, matching the ledger and provenance: inventories are
   * public within a community, so this is the same page whether you are
   * looking at yourself, a trade partner, or someone you are about to correct.
   * Permissions add actions to it; they do not change what it shows.
   */
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => MemberHoldingsReport, {
    name: "memberHoldings",
    description:
      "One member's live holdings in one community, grouped by item type and " +
      "not paginated -- an inventory is a whole thing.",
  })
  async memberHoldings(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("userId", { type: () => ID }) userId: string,
  ): Promise<MemberHoldingsReport> {
    const report = await this.itemsService.findMemberHoldings(
      userId,
      communityId,
    );

    return {
      ...report,
      member: mapPrismaUserToGraphQL(report.member),
      holdings: report.holdings.map((h) => ({
        count: h.count,
        itemType: mapPrismaItemTypeToGraphQL(h.itemType),
        items: h.items.map(mapPrismaItemToGraphQL),
      })),
    };
  }

  // ==================== Item Mutations ====================

  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemTypeId: "input.itemTypeId" })
  @Mutation(() => [ItemEntity], {
    description:
      "Grant items to a user. Returns one Item per unit granted -- there is no " +
      "stacking, so a quantity of 3 creates three items.",
  })
  async grantItem(
    @Args("input") input: GrantItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ItemEntity[]> {
    const items = await this.itemsService.grantItem({
      itemTypeId: input.itemTypeId,
      userId: input.userId,
      quantity: input.quantity ?? 1,
      metadata: input.metadata,
      pendingOwner: input.pendingOwner,
      actor: {
        actorUserId: user.id,
        reason: input.reason,
        staffNote: input.staffNote,
      },
    });

    return items.map(mapPrismaItemToGraphQL);
  }

  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: "id" })
  @Mutation(() => ItemEntity, {
    description:
      "Update one item's instance metadata. Quantity is not updatable: an " +
      "item is one item, so more means grantItem and fewer means revokeItems.",
  })
  async updateItem(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateItemInput,
  ): Promise<ItemEntity> {
    const item = await this.itemsService.updateItem(id, {
      metadata: input.metadata,
    });

    return mapPrismaItemToGraphQL(item);
  }

  // The community is resolved from the first item only. Safe because the
  // service rejects a revoke whose items span more than one item type, and an
  // item type belongs to exactly one community.
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ itemId: "itemIds.0" })
  @Mutation(() => Int, {
    description:
      "Revoke items, destroying them. Soft: a destroyed item keeps its " +
      "provenance readable. A public reason is required -- it is written to " +
      "the ledger and shown to anyone who can read it. Returns the count.",
  })
  async revokeItems(
    @Args("itemIds", { type: () => [ID] }) itemIds: string[],
    @Args("reason", {
      description: "Member-facing. Shown on the items' public provenance.",
    })
    reason: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("staffNote", {
      nullable: true,
      description: "Staff-only detail. Never shown to members.",
    })
    staffNote?: string,
  ): Promise<number> {
    return this.itemsService.revokeItems(itemIds, {
      actorUserId: user.id,
      reason,
      staffNote,
    });
  }

  // Only membership, not a permission: using your own item is not a staff act.
  // The service does the rest -- that you hold it, that it is consumable, that
  // it pays something, and that the currency is still live.
  @AllowAnyAuthenticated()
  @Mutation(() => UseItemResult, {
    description:
      "Use one of your items up. Destroys it and pays what its type is worth " +
      "in one transaction, under one batch id across both ledgers.",
  })
  async useItem(
    @Args("input") input: UseItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<UseItemResult> {
    const result = await this.itemsService.useItem(input.itemId, user.id);
    return {
      itemTypeName: result.itemTypeName,
      batchId: result.batchId,
      payout: result.payout.map((p) => ({
        id: p.id,
        currency: mapPrismaCurrencyToGraphQL(p.currency),
        amount: p.amount,
      })),
    };
  }

  // ==================== Field Resolvers ====================

  /**
   * Resolved per item type rather than included in every read.
   *
   * The alternative was widening the mapper and remembering the include on
   * each of the several paths that read item types -- and a path that forgot
   * would report an empty payout, which reads as "this pays nothing" rather
   * than as a missing join. A wrong answer beats a slow one only if you never
   * find out, and members would not.
   *
   * One query per item type on a list, in a codebase with no DataLoader
   * anywhere (#97). Worth revisiting with the rest of them, not before.
   */
  @AllowUnauthenticated()
  @ResolveField(() => [ItemUsePayoutComponent], { name: "usePayout" })
  async resolveUsePayout(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<ItemUsePayoutComponent[]> {
    return this.itemsService.findItemTypePayout(itemType.id);
  }

  @AllowUnauthenticated()
  @ResolveField(() => Community, { nullable: true })
  async community(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<Community | null> {
    if (itemType.community) {
      return itemType.community;
    }
    return this.communitiesService.findOne(itemType.communityId);
  }

  @AllowUnauthenticated()
  @ResolveField(() => CommunityColor, { name: "color", nullable: true })
  async resolveColor(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<CommunityColor | null> {
    if (!itemType.colorId) {
      return null;
    }

    try {
      return await this.communityColorsService.findCommunityColorById(
        itemType.colorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @AllowUnauthenticated()
  @ResolveField(() => Image, { name: "image", nullable: true })
  async resolveImage(
    @Parent() itemType: ItemTypeEntity,
  ): Promise<Image | null> {
    if (!itemType.imageId) {
      return null;
    }
    const prismaImage = await this.database.image.findUnique({
      where: { id: itemType.imageId },
      include: {
        uploader: true,
        artist: true,
      },
    });

    if (!prismaImage) {
      return null;
    }

    return mapPrismaImageToGraphQL(prismaImage);
  }
}

// Separate resolver for Item entity fields
@Resolver(() => ItemEntity)
export class ItemFieldsResolver {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly usersService: UsersService,
    private readonly pendingOwnershipService: PendingOwnershipService,
  ) {}

  @AllowUnauthenticated()
  @ResolveField(() => ItemTypeEntity, { name: "itemType" })
  async resolveItemType(@Parent() item: ItemEntity): Promise<ItemTypeEntity> {
    const itemType = await this.itemsService.findItemTypeById(item.itemTypeId);
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  @AllowUnauthenticated()
  @ResolveField(() => User, { name: "owner", nullable: true })
  async resolveOwner(@Parent() item: ItemEntity): Promise<User | null> {
    if (!item.ownerId) return null; // Orphaned item
    const user = await this.usersService.findById(item.ownerId);
    if (!user) {
      return null;
    }
    return mapPrismaUserToGraphQL(user);
  }

  @AllowUnauthenticated()
  @ResolveField(() => PendingOwnership, {
    name: "pendingOwnership",
    nullable: true,
  })
  async resolvePendingOwnership(
    @Parent() item: ItemEntity,
  ): Promise<PendingOwnership | null> {
    const pending = await this.pendingOwnershipService.findByItemId(item.id);
    return pending ? mapPrismaPendingOwnershipToGraphQL(pending) : null;
  }
}
