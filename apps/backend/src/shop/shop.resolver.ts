import { Resolver, Query, Mutation, Args, ID, Int } from "@nestjs/graphql";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { PermissionService } from "../auth/PermissionService";
import { DatabaseService } from "../database/database.service";
import { ShopService } from "./shop.service";
import {
  ShopItem,
  ShopPurchase,
  ShopPurchaseLine,
} from "./entities/shop.entity";
import {
  CreateShopItemInput,
  UpdateShopItemInput,
  CheckoutInput,
} from "./dto/shop.dto";

/**
 * Reading the shop needs community membership; defining what it sells needs
 * `canManageItems`; buying needs only that you can afford it.
 *
 * Note the absence of `@AllowAnyAuthenticated` on anything here. The global
 * guard ORs every permission decorator together, so pairing it with a
 * community permission would mean "authenticated OR permitted" -- which is
 * just "authenticated". That exact pairing was a real hole on the item
 * mutations once.
 */
@Resolver(() => ShopItem)
export class ShopResolver {
  constructor(
    private readonly shop: ShopService,
    private readonly permissions: PermissionService,
    private readonly db: DatabaseService,
  ) {}

  // ==================== Queries ====================

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [ShopItem], {
    name: "shopItems",
    description:
      "What a community sells, priced, with what the viewer can afford.",
  })
  async shopItems(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("includeInactive", { type: () => Boolean, defaultValue: false })
    includeInactive: boolean,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopItem[]> {
    // Only staff may see what is not for sale; asking as a member quietly
    // gets the public list rather than an error.
    const canManage = await this.permissions.hasCommunityPermission(
      user.id,
      communityId,
      CommunityPermission.CanManageItems,
    );
    const rows = await this.shop.findShopForViewer(
      communityId,
      user.id,
      includeInactive && canManage,
    );
    return rows;
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [ShopPurchase], {
    name: "myShopPurchases",
    description:
      "The viewer's own purchases, newest first, each line saying whether it " +
      "can still be undone and why not.",
  })
  async myShopPurchases(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopPurchase[]> {
    const rows = await this.shop.findPurchasesForViewer(communityId, user.id);
    return rows;
  }

  /**
   * The same purchases seen from outside.
   *
   * Gated on `canGrantItems` -- the permission that already means "may move
   * items and coin on somebody else's behalf" -- rather than on
   * `canManageItems`, which is about defining what exists.
   */
  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [ShopPurchase], {
    name: "communityShopPurchases",
    description:
      "Every member's purchases, newest first, for staff handling a refund " +
      "past the buyer's own undo window.",
  })
  async communityShopPurchases(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("buyerId", { type: () => ID, nullable: true }) buyerId: string | null,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 50 })
    limit: number,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopPurchase[]> {
    return this.shop.findPurchasesForCommunity(communityId, user.id, {
      buyerId,
      limit,
    });
  }

  // ==================== Admin ====================

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => ShopItem)
  async createShopItem(
    @Args("input") input: CreateShopItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopItem> {
    const row = await this.shop.createShopItem(input);
    // Read back through the viewer projection rather than returning the row
    // straight from the write. `ShopItem` has non-nullable fields that only
    // exist relative to whoever is asking, and a mutation that returns a row
    // without them fails *after* committing -- which looks to the caller like
    // the write did not happen.
    return this.shop.findShopItemForViewer(row.id, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ shopItemId: "id" })
  @Mutation(() => ShopItem)
  async updateShopItem(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateShopItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopItem> {
    const row = await this.shop.updateShopItem(id, input);
    return this.shop.findShopItemForViewer(row.id, user.id);
  }

  // ==================== Buying ====================

  /**
   * Buying needs membership and nothing more. The balance is the
   * authorisation, exactly as it is for sending currency.
   */
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => ShopPurchase, {
    description: "Buy a cart. Everything commits together, or nothing does.",
  })
  async checkout(
    @Args("input") input: CheckoutInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopPurchase> {
    const row = await this.shop.checkout(
      input.communityId,
      user.id,
      input.lines,
    );
    return row;
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ shopPurchaseLineId: "lineId" })
  @Mutation(() => ShopPurchaseLine, {
    description:
      "Undo one unit. The buyer may do this inside the window; staff at any " +
      "time. Nothing is rewritten -- the coin comes back as new ledger rows.",
  })
  async refundShopPurchaseLine(
    @Args("lineId", { type: () => ID }) lineId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<ShopPurchaseLine> {
    const line = await this.db.shopPurchaseLine.findUnique({
      where: { id: lineId },
      select: { purchase: { select: { communityId: true } } },
    });
    const isStaff = line
      ? await this.permissions.hasCommunityPermission(
          user.id,
          line.purchase.communityId,
          CommunityPermission.CanGrantItems,
        )
      : false;

    const row = await this.shop.refundLine(lineId, user.id, isStaff);
    return row;
  }
}
