import { Args, ID, Int, Query, Resolver } from "@nestjs/graphql";
import { AllowUnauthenticated } from "../../auth/decorators/AllowUnauthenticated";
import {
  CurrentUser,
  type CurrentUserType,
} from "../../auth/decorators/CurrentUser";
import { HalloweenStaffAccess } from "../dashboard/halloween-staff-access";
import { HalloweenPrizeListService } from "./halloween-prize-list.service";
import {
  HalloweenPrizeListing,
  HalloweenPublicWin,
} from "./halloween-prize-list.types";

/** The public Halloween prize list: open to anyone, signed in or not. */
@Resolver()
export class HalloweenPrizeListResolver {
  constructor(
    private readonly prizeList: HalloweenPrizeListService,
    private readonly staffAccess: HalloweenStaffAccess,
  ) {}

  @AllowUnauthenticated()
  @Query(() => [HalloweenPrizeListing], {
    description:
      "Every prize in the community's Halloween pool, in stock first. " +
      "Empty while the event is off.",
  })
  halloweenPrizes(
    @Args("communityId", { type: () => ID }) communityId: string,
  ): Promise<HalloweenPrizeListing[]> {
    return this.prizeList.prizes(communityId);
  }

  @AllowUnauthenticated()
  @Query(() => [HalloweenPublicWin], {
    description:
      "The community's latest Halloween wins, newest first: 20 unless given, " +
      "at most 50. Staff who grant or manage items see unlinked winners' " +
      "Discord handles; everyone else sees only linked chardb accounts.",
  })
  async halloweenRecentWins(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("limit", { type: () => Int, nullable: true }) limit: number | null,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<HalloweenPublicWin[]> {
    return this.prizeList.recentWins(
      communityId,
      limit ?? undefined,
      user ? await this.staffAccess.isStaff(user.id, communityId) : false,
    );
  }
}
