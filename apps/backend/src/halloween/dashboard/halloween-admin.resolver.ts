import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { AllowCommunityPermission } from "../../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../../auth/decorators/ResolveCommunityFrom";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import { CommunityPermission } from "../../auth/CommunityPermission";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { HalloweenAdminService } from "./halloween-admin.service";
import { HalloweenSettingsInput } from "./halloween-admin.inputs";
import { HalloweenEventSettings } from "./halloween-dashboard.types";

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
}
