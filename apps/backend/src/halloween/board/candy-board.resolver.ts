import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowUnauthenticated } from "../../auth/decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "../../auth/decorators/AllowAnyAuthenticated";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import type {
  AuthenticatedCurrentUserType,
  CurrentUserType,
} from "../../auth/types/current-user.type";
import { CandyBoardService } from "./candy-board.service";
import {
  HalloweenCandyBoard,
  HalloweenCandyBoardAction,
  HalloweenCandyBackgroundEffectsInput,
  HalloweenCandyLightingInput,
} from "./candy-board.types";

/** Candy boards: anyone with the link can look at one; its owner arranges it. */
@Resolver()
export class CandyBoardResolver {
  constructor(private readonly boards: CandyBoardService) {}

  @AllowUnauthenticated()
  @Query(() => HalloweenCandyBoard, {
    nullable: true,
    description:
      "A Halloween candy board, by the id in its link. Null if there is no " +
      "such board in this community's Discord server, or the community has " +
      "none linked. An error if the community does not exist or has the " +
      "Halloween event turned off.",
  })
  async halloweenCandyBoard(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<HalloweenCandyBoard | null> {
    return this.boards.getBoard(communityId, id, user?.id ?? null);
  }

  @AllowAnyAuthenticated()
  @Query(() => HalloweenCandyBoard, {
    nullable: true,
    description:
      "Your Halloween candy board here, made the first time you ask. Null " +
      "without Discord linked, since candies belong to Discord players.",
  })
  async myHalloweenCandyBoard(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard | null> {
    return this.boards.getMyBoard(communityId, user.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyBoard, {
    description:
      "Apply changes to your board, in order, and get it back as it now is. " +
      "A change that cannot apply -- a candy not yours, not on the board, " +
      "already on it, or placed off it -- is skipped, and the rest still " +
      "apply. At most 100 changes at once. Needs Discord linked.",
  })
  async applyHalloweenCandyBoardActions(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("actions", { type: () => [HalloweenCandyBoardAction] })
    actions: HalloweenCandyBoardAction[],
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard> {
    return this.boards.applyActions(communityId, user.id, actions);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyBoard, {
    description:
      "Put the light that casts your candies' shadows; null goes back to " +
      "the board's default light. Needs Discord linked.",
  })
  async setHalloweenCandyBoardLighting(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("lighting", {
      type: () => HalloweenCandyLightingInput,
      nullable: true,
    })
    lighting: HalloweenCandyLightingInput | null,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard> {
    return this.boards.setLighting(communityId, user.id, lighting ?? null);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyBoard, {
    description:
      "Set the picture or tile behind your candies, by its slug, and how it " +
      "is dimmed and tinted; a null slug goes back to none chosen, and null " +
      "effects to neither. Needs Discord linked.",
  })
  async setHalloweenCandyBoardBackground(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("slug", { type: () => String, nullable: true }) slug: string | null,
    @Args("effects", {
      type: () => HalloweenCandyBackgroundEffectsInput,
      nullable: true,
    })
    effects: HalloweenCandyBackgroundEffectsInput | null,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard> {
    return this.boards.setBackground(
      communityId,
      user.id,
      slug ?? null,
      effects ?? null,
    );
  }
}
