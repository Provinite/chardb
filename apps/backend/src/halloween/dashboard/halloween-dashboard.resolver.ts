import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ForbiddenException, Logger } from "@nestjs/common";
import { PermissionService } from "../../auth/PermissionService";
import { AllowCommunityPermission } from "../../auth/decorators/AllowCommunityPermission";
import { AllowGlobalAdmin } from "../../auth/decorators/AllowGlobalAdmin";
import { ResolveCommunityFrom } from "../../auth/decorators/ResolveCommunityFrom";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import { CommunityPermission } from "../../auth/CommunityPermission";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { DatabaseService } from "../../database/database.service";
import { Community } from "../../communities/entities/community.entity";
import { mapPrismaCommunityToGraphQL } from "../../communities/utils/community-resolver-mappers";
import { HalloweenLogEvent, type HalloweenLogLine } from "../logging";
import { HalloweenDashboardService } from "./halloween-dashboard.service";
import {
  HalloweenDashboard,
  HalloweenWin,
  HalloweenWinFilter,
  HalloweenWinPage,
} from "./halloween-dashboard.types";

/**
 * The Halloween event's web side. Discord stays where the event is run; this
 * is where staff see it and track hand-delivered prizes.
 */
@Resolver()
export class HalloweenDashboardResolver {
  private readonly logger = new Logger(HalloweenDashboardResolver.name);

  constructor(
    private readonly dashboard: HalloweenDashboardService,
    private readonly db: DatabaseService,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * Reading is open to the people who hand prizes out (`canGrantItems`, as
   * the shop's purchase list is) and to those who set the pool up
   * (`canManageItems`). The decorator takes one permission, so it admits any
   * member and this narrows it.
   */
  private async assertCanView(
    userId: string,
    communityId: string,
  ): Promise<void> {
    const [canGrant, canManage] = await Promise.all([
      this.permissions.hasCommunityPermission(
        userId,
        communityId,
        CommunityPermission.CanGrantItems,
      ),
      this.permissions.hasCommunityPermission(
        userId,
        communityId,
        CommunityPermission.CanManageItems,
      ),
    ]);
    if (!canGrant && !canManage) {
      throw new ForbiddenException(
        "Seeing the Halloween event needs permission to grant or manage items",
      );
    }
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => HalloweenDashboard, {
    description:
      "The Halloween event in this community's Discord server: settings, " +
      "totals and prize pool. Requires the event to be enabled, and " +
      "canGrantItems or canManageItems.",
  })
  async halloweenDashboard(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenDashboard> {
    await this.assertCanView(user.id, communityId);
    return this.dashboard.getDashboard(communityId);
  }

  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => HalloweenWinPage, {
    description:
      "The Halloween event's wins, newest first, a page at a time (at most 100).",
  })
  async halloweenWins(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("filter", {
      type: () => HalloweenWinFilter,
      nullable: true,
      defaultValue: HalloweenWinFilter.ALL,
    })
    filter: HalloweenWinFilter,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 50 })
    limit: number,
    @Args("offset", { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenWinPage> {
    await this.assertCanView(user.id, communityId);
    return this.dashboard.getWins(communityId, filter, limit, offset);
  }

  @AllowCommunityPermission(CommunityPermission.CanGrantItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenWin, {
    description:
      "Mark a prize staff hand over themselves as delivered, or clear the " +
      "mark. Chardb item and character prizes deliver themselves.",
  })
  async setHalloweenPrizeDelivered(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("knockEventId", { type: () => Int }) knockEventId: number,
    @Args("delivered") delivered: boolean,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenWin> {
    return this.dashboard.setDelivered(
      communityId,
      knockEventId,
      delivered,
      user.id,
    );
  }

  /**
   * Site admins only: the event is not generally available, so a community
   * sees nothing about it until it is turned on here.
   */
  @AllowGlobalAdmin()
  @Mutation(() => Community, {
    description:
      "Turn the Halloween event's pages on or off for a community (site admins)",
  })
  async setCommunityHalloweenEnabled(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("enabled") enabled: boolean,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Community> {
    const community = await this.db.community.update({
      where: { id: communityId },
      data: { halloweenEnabled: enabled },
    });
    this.logger.log({
      event: HalloweenLogEvent.CommunityToggled,
      message: enabled
        ? "Halloween event turned on for a community"
        : "Halloween event turned off for a community",
      communityId,
      communityName: community.name,
      enabled,
      actorUserId: user.id,
    } satisfies HalloweenLogLine);
    return mapPrismaCommunityToGraphQL(community);
  }
}
