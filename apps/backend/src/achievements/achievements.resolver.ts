import { Args, ID, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { User } from "../users/entities/user.entity";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AchievementsService } from "./achievements.service";
import { UserAchievement } from "./user-achievement.entity";

@Resolver(() => User)
export class AchievementsResolver {
  constructor(private readonly achievements: AchievementsService) {}

  /**
   * What a user earned in one community. Public: a community shows it on the
   * user's profile there, which already says they belong, and it is only
   * ever asked of one community at a time.
   */
  @AllowUnauthenticated()
  @ResolveField("achievements", () => [UserAchievement], {
    description: "What the user has earned in a community, newest first.",
  })
  achievementsIn(
    @Parent() user: User,
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<UserAchievement[]> {
    return this.achievements.inCommunity(user.id, communityId);
  }
}
