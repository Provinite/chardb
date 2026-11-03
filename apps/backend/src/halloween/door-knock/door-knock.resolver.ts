import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowAnyAuthenticated } from "../../auth/decorators/AllowAnyAuthenticated";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { DoorKnockService } from "./door-knock.service";
import { HalloweenDoor, HalloweenDoorKnockResult } from "./door-knock.types";

/** Knocking on other members' doors for candy. */
@Resolver()
export class DoorKnockResolver {
  constructor(private readonly doorKnocks: DoorKnockService) {}

  @AllowAnyAuthenticated()
  @Query(() => HalloweenDoor, {
    nullable: true,
    description:
      "A member's door as you find it. Null while the community has no " +
      "Halloween event running.",
  })
  halloweenDoor(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenDoor | null> {
    return this.doorKnocks.door(communityId, user.id, userId);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenDoorKnockResult, {
    description:
      "Knock on a member's door: you and they each get 1-3 candies, and " +
      "they are told what they got. Once per door a day, within your " +
      "daily door knocks.",
  })
  knockOnHalloweenDoor(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenDoorKnockResult> {
    return this.doorKnocks.knock(communityId, user.id, userId);
  }
}
