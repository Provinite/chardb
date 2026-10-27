import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowUnauthenticated } from "../../auth/decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "../../auth/decorators/AllowAnyAuthenticated";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { CandyBoardService } from "./candy-board.service";
import {
  HalloweenCandyBoard,
  HalloweenCandyPlacementInput,
} from "./candy-board.types";

/** Candy boards: anyone can look at one, and its owner arranges it. */
@Resolver()
export class CandyBoardResolver {
  constructor(private readonly boards: CandyBoardService) {}

  @AllowUnauthenticated()
  @Query(() => HalloweenCandyBoard, {
    nullable: true,
    description:
      "A player's Halloween candy board, by their chardb username. Null when " +
      "they have no Discord linked, since candies belong to Discord players.",
  })
  async halloweenCandyBoard(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("username") username: string,
  ): Promise<HalloweenCandyBoard | null> {
    return this.boards.getBoard(communityId, username);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyBoard, {
    description:
      "Replace where your candies sit on your board. Needs Discord linked.",
  })
  async saveHalloweenCandyBoard(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("placements", { type: () => [HalloweenCandyPlacementInput] })
    placements: HalloweenCandyPlacementInput[],
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyBoard> {
    return this.boards.saveBoard(communityId, user.id, placements);
  }
}
