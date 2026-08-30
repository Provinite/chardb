import {
  Resolver,
  Query,
  Args,
  ID,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException } from "@nestjs/common";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { PermissionService } from "../auth/PermissionService";
import { DatabaseService } from "../database/database.service";
import { ItemTransactionsService } from "./item-transactions.service";
import {
  ItemTransaction,
  ItemTransactionConnection,
} from "./entities/item-transaction.entity";
import { ItemTransactionFiltersInput } from "./dto/item-transaction.dto";
import {
  mapPrismaItemTransactionToGraphQL,
  mapPrismaItemTransactionConnectionToGraphQL,
} from "./utils/item-transaction-resolver-mappers";
import { ItemType as ItemTypeEntity } from "../items/entities/item-type.entity";
import { Item as ItemEntity } from "../items/entities/item.entity";
import { User } from "../users/entities/user.entity";
import { mapPrismaItemTypeToGraphQL } from "../items/utils/item-type-resolver-mappers";
import { mapPrismaItemToGraphQL } from "../items/utils/item-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";

/**
 * Reading the ledger requires community membership and nothing more.
 *
 * That is a product decision, not an oversight: provenance is public to the
 * community so it can act as a trust signal in member-to-member trades. Write
 * permissions still gate the mutations that produce these rows.
 *
 * Note the absence of @AllowAnyAuthenticated on the queries. The global guard
 * ORs every permission decorator together, so pairing it with a community
 * permission would mean "authenticated OR permitted" -- which is just
 * "authenticated", and the community check would never bind. The field
 * resolvers below do carry it, because they are only ever reached through a
 * query that has already gated on membership.
 */
@Resolver(() => ItemTransaction)
export class ItemTransactionsResolver {
  constructor(
    private readonly itemTransactionsService: ItemTransactionsService,
    private readonly permissionService: PermissionService,
    private readonly database: DatabaseService,
  ) {}

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "filters.communityId" })
  @Query(() => ItemTransactionConnection, {
    name: "itemTransactions",
    description:
      "The item ledger for one community, newest first. Readable by any member.",
  })
  async findAll(
    @Args("filters") filters: ItemTransactionFiltersInput,
  ): Promise<ItemTransactionConnection> {
    const result = await this.itemTransactionsService.findAll(filters);
    return mapPrismaItemTransactionConnectionToGraphQL(result);
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ itemId: "itemId" })
  @Query(() => [ItemTransaction], {
    name: "itemProvenance",
    description:
      "Every ledger row for one stack, oldest first. The provenance timeline.",
  })
  async findByItem(
    @Args("itemId", { type: () => ID }) itemId: string,
  ): Promise<ItemTransaction[]> {
    const rows = await this.itemTransactionsService.findByItem(itemId);
    return rows.map(mapPrismaItemTransactionToGraphQL);
  }

  // ==================== Field Resolvers ====================

  /**
   * Re-read per viewer rather than carried on the mapped entity, so a caller
   * that forgets to strip it cannot leak one. Returns null -- not an error --
   * for viewers without item permissions: the row itself is legitimately
   * visible to them, only this field is not.
   */
  @AllowAnyAuthenticated()
  @ResolveField(() => String, {
    name: "staffNote",
    nullable: true,
    description:
      "Staff-only note. Null unless the viewer holds canManageItems or " +
      "canGrantItems in this community.",
  })
  async resolveStaffNote(
    @Parent() transaction: ItemTransaction,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<string | null> {
    const [canManage, canGrant] = await Promise.all([
      this.permissionService.hasCommunityPermission(
        user.id,
        transaction.communityId,
        CommunityPermission.CanManageItems,
      ),
      this.permissionService.hasCommunityPermission(
        user.id,
        transaction.communityId,
        CommunityPermission.CanGrantItems,
      ),
    ]);

    if (!canManage && !canGrant) return null;

    const row = await this.database.itemTransaction.findUnique({
      where: { id: transaction.id },
      select: { staffNote: true },
    });
    return row?.staffNote ?? null;
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => ItemTypeEntity, { name: "itemType" })
  async resolveItemType(
    @Parent() transaction: ItemTransaction,
  ): Promise<ItemTypeEntity> {
    const itemType = await this.database.itemType.findUnique({
      where: { id: transaction.itemTypeId },
    });
    if (!itemType) {
      throw new NotFoundException(
        `ItemType with ID ${transaction.itemTypeId} not found`,
      );
    }
    return mapPrismaItemTypeToGraphQL(itemType);
  }

  /** Null once the stack has been revoked away -- the row outlives it. */
  @AllowAnyAuthenticated()
  @ResolveField(() => ItemEntity, { name: "item", nullable: true })
  async resolveItem(
    @Parent() transaction: ItemTransaction,
  ): Promise<ItemEntity | null> {
    if (!transaction.itemId) return null;
    const item = await this.database.item.findUnique({
      where: { id: transaction.itemId },
    });
    return item ? mapPrismaItemToGraphQL(item) : null;
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "fromUser", nullable: true })
  resolveFromUser(@Parent() transaction: ItemTransaction) {
    return this.loadUser(transaction.fromUserId);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "toUser", nullable: true })
  resolveToUser(@Parent() transaction: ItemTransaction) {
    return this.loadUser(transaction.toUserId);
  }

  @AllowAnyAuthenticated()
  @ResolveField(() => User, { name: "actorUser", nullable: true })
  resolveActorUser(@Parent() transaction: ItemTransaction) {
    return this.loadUser(transaction.actorUserId);
  }

  private async loadUser(userId?: string | null): Promise<User | null> {
    if (!userId) return null;
    const user = await this.database.user.findUnique({ where: { id: userId } });
    return user ? mapPrismaUserToGraphQL(user) : null;
  }
}
