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
      "such board in this community.",
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
      "Apply changes to your board, in order, all or none. Needs Discord linked.",
  })
  async applyHalloweenCandyBoardActions(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("actions", { type: () => [HalloweenCandyBoardAction] })
    actions: HalloweenCandyBoardAction[],
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard> {
    return this.boards.applyActions(communityId, user.id, actions);
  }
}
