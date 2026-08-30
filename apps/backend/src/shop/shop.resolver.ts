import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
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
    return rows as unknown as ShopItem[];
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
    return rows as unknown as ShopPurchase[];
  }

  // ==================== Admin ====================

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "input.communityId" })
  @Mutation(() => ShopItem)
  async createShopItem(
    @Args("input") input: CreateShopItemInput,
  ): Promise<ShopItem> {
    const row = await this.shop.createShopItem(input);
    return row as unknown as ShopItem;
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ shopItemId: "id" })
  @Mutation(() => ShopItem)
  async updateShopItem(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateShopItemInput,
  ): Promise<ShopItem> {
    const row = await this.shop.updateShopItem(id, input);
    return row as unknown as ShopItem;
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
    return row as unknown as ShopPurchase;
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
    return row as unknown as ShopPurchaseLine;
  }
}
