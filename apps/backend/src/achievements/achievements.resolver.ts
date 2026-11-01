import { Args, ID, Query, Resolver } from "@nestjs/graphql";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { AchievementsService } from "./achievements.service";
import { UserAchievement } from "./user-achievement.entity";

@Resolver(() => UserAchievement)
export class AchievementsResolver {
  constructor(private readonly achievements: AchievementsService) {}

  /**
   * What one member earned in one community. Asked of a single community,
   * like `communityMemberRoles`: who someone is here is already on the
   * members list, so a fellow member may see it, while the full list of
   * communities a person belongs to stays theirs.
   */
  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ communityId: "communityId" })
  @Query(() => [UserAchievement], {
    name: "communityMemberAchievements",
    description: "What a member has earned in a community, newest first.",
  })
  communityMemberAchievements(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("userId", { type: () => ID }) userId: string,
  ): Promise<UserAchievement[]> {
    return this.achievements.inCommunity(userId, communityId);
  }
}
