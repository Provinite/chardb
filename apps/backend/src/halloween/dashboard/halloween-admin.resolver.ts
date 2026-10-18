import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowCommunityPermission } from "../../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../../auth/decorators/ResolveCommunityFrom";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import { CommunityPermission } from "../../auth/CommunityPermission";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { HalloweenAdminService } from "./halloween-admin.service";
import {
  CreateHalloweenPrizeInput,
  HalloweenSettingsInput,
  UpdateHalloweenPrizeInput,
} from "./halloween-admin.inputs";
import {
  HalloweenEventSettings,
  HalloweenPrizeOptions,
  HalloweenPrizeView,
} from "./halloween-dashboard.types";

/**
 * Running the Halloween event from chardb. Gated on `canManageItems`: this is
 * deciding what exists to be won, as defining item types is.
 */
@Resolver()
export class HalloweenAdminResolver {
  constructor(private readonly admin: HalloweenAdminService) {}

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenEventSettings, {
    description:
      "Set the Halloween event's dates, knocks per day, reset hour, win rate " +
      "and win channel. Creates them the first time.",
  })
  async updateHalloweenSettings(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("input") input: HalloweenSettingsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenEventSettings> {
    return this.admin.updateSettings(communityId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenPrizeView, {
    description: "Add a prize to the Halloween event's pool",
  })
  async createHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("input") input: CreateHalloweenPrizeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenPrizeView> {
    return this.admin.createPrize(communityId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => HalloweenPrizeView, {
    description:
      "Change a Halloween prize's name, weight, stock or (for a prize staff " +
      "hand over) image",
  })
  async updateHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("prizeId", { type: () => ID }) prizeId: string,
    @Args("input") input: UpdateHalloweenPrizeInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenPrizeView> {
    return this.admin.updatePrize(communityId, prizeId, input, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Mutation(() => Boolean, {
    description:
      "Remove a Halloween prize nobody has won. A won prize stays on record.",
  })
  async removeHalloweenPrize(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("prizeId", { type: () => ID }) prizeId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.admin.removePrize(communityId, prizeId, user.id);
  }

  @AllowCommunityPermission(CommunityPermission.CanManageItems)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => HalloweenPrizeOptions, {
    description:
      "What a new Halloween prize can hand over: item types, and characters " +
      "nobody owns or has been promised (25 of each per search)",
  })
  async halloweenPrizeOptions(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("search", { type: () => String, nullable: true })
    search: string | null,
  ): Promise<HalloweenPrizeOptions> {
    return this.admin.prizeOptions(communityId, search);
  }
}
