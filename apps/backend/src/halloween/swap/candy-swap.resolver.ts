import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowUnauthenticated } from "../../auth/decorators/AllowUnauthenticated";
import { AllowAnyAuthenticated } from "../../auth/decorators/AllowAnyAuthenticated";
import { CurrentUser } from "../../auth/decorators/CurrentUser";
import type { AuthenticatedCurrentUserType } from "../../auth/types/current-user.type";
import { HalloweenCandy } from "../board/candy-board.types";
import { CandySwapService } from "./candy-swap.service";
import {
  HalloweenCandyOffer,
  HalloweenCandyOfferPlaced,
  HalloweenCandySwapLimits,
  HalloweenCandyTradeRecord,
} from "./candy-swap.types";

/** The candy swap: offering candies for others, anonymously until traded. */
@Resolver()
export class CandySwapResolver {
  constructor(private readonly swap: CandySwapService) {}

  @AllowUnauthenticated()
  @Query(() => [String], {
    description:
      "Every kind of Halloween candy, by slug: its image is " +
      "/halloween/candy/<slug>.png on the frontend",
  })
  halloweenCandyTypes(): readonly string[] {
    return this.swap.candyTypes();
  }

  @AllowUnauthenticated()
  @Query(() => HalloweenCandySwapLimits)
  halloweenCandySwapLimits(): HalloweenCandySwapLimits {
    return this.swap.limits();
  }

  @AllowAnyAuthenticated()
  @Query(() => [HalloweenCandy], {
    description:
      "Your Halloween candies here that are not held in an offer, oldest first",
  })
  myHalloweenCandies(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandy[]> {
    return this.swap.myCandies(communityId, user.id);
  }

  @AllowAnyAuthenticated()
  @Query(() => [HalloweenCandyOffer], {
    description:
      "A random handful of other players' open candy offers that you have a " +
      "spare candy of the wanted kind for. At most 50; 12 unless given.",
  })
  halloweenCandySwapOffers(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("limit", { type: () => Int, nullable: true }) limit: number | null,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyOffer[]> {
    return this.swap.browse(communityId, user.id, limit ?? undefined);
  }

  @AllowAnyAuthenticated()
  @Query(() => [HalloweenCandyOffer], {
    description: "Your open candy offers here, newest first",
  })
  myHalloweenCandyOffers(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyOffer[]> {
    return this.swap.myOffers(communityId, user.id);
  }

  @AllowAnyAuthenticated()
  @Query(() => [HalloweenCandyTradeRecord], {
    description: "The candy swaps you took part in here, newest first",
  })
  myHalloweenCandyTrades(
    @Args("communityId", { type: () => ID }) communityId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyTradeRecord[]> {
    return this.swap.myTrades(communityId, user.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyOfferPlaced, {
    description:
      "Offer 1-3 of your candies, none of the wanted kind, for one candy of " +
      "`wantSlug`, or of any kind when it is null. They are held until the " +
      "offer is filled or cancelled. At most 10 open offers. A one-for-one " +
      "offer that meets a compatible one-for-one offer of another player's " +
      "trades at once; two offers for any kind never meet.",
  })
  placeHalloweenCandyOffer(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("candyIds", { type: () => [Int] }) candyIds: number[],
    @Args("wantSlug", { type: () => String, nullable: true })
    wantSlug: string | null,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyOfferPlaced> {
    return this.swap.place(communityId, user.id, candyIds, wantSlug);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => HalloweenCandyTradeRecord, {
    description:
      "Fill another player's open offer: one of your spare candies of the " +
      "wanted kind, the oldest not on a board or else the oldest, for " +
      "everything it offers. An offer for any kind needs `giveSlug`, a " +
      "kind it does not give.",
  })
  acceptHalloweenCandyOffer(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("offerId", { type: () => ID }) offerId: string,
    @Args("giveSlug", { type: () => String, nullable: true })
    giveSlug: string | null,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<HalloweenCandyTradeRecord> {
    return this.swap.accept(communityId, user.id, offerId, giveSlug);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Boolean, {
    description: "Withdraw one of your open offers, getting its candies back",
  })
  cancelHalloweenCandyOffer(
    @Args("communityId", { type: () => ID }) communityId: string,
    @Args("offerId", { type: () => ID }) offerId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.swap.cancel(communityId, user.id, offerId);
  }
}
