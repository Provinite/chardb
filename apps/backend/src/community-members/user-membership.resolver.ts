import { Args, ID, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { User } from "../users/entities/user.entity";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { CommunityMembersService } from "./community-members.service";

@Resolver(() => User)
export class UserMembershipResolver {
  constructor(private readonly communityMembers: CommunityMembersService) {}

  /**
   * Whether this person belongs to one community, so a community host can
   * tell a member's profile from a stranger's. Signed in only, like the
   * community's members list, which answers the same question by listing.
   */
  @AllowAnyAuthenticated()
  @ResolveField("isMemberOf", () => Boolean, {
    description: "Whether this person belongs to the community",
  })
  async isMemberOf(
    @Parent() user: User,
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<boolean> {
    return this.communityMembers.isMember(user.id, communityId);
  }
}
