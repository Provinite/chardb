import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { User } from "../users/entities/user.entity";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AchievementsService } from "./achievements.service";
import { UserAchievement } from "./user-achievement.entity";

@Resolver(() => User)
export class AchievementsResolver {
  constructor(private readonly achievements: AchievementsService) {}

  @AllowUnauthenticated()
  @ResolveField("achievements", () => [UserAchievement], {
    description: "What the user has earned, newest first.",
  })
  achievementsOf(@Parent() user: User): Promise<UserAchievement[]> {
    return this.achievements.forUser(user.id);
  }
}
