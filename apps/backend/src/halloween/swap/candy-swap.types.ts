import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { HalloweenCandyOfferStatus } from "@chardb/database";
import { User } from "../../users/entities/user.entity";
import { HalloweenCandy } from "../board/candy-board.types";

registerEnumType(HalloweenCandyOfferStatus, {
  name: "HalloweenCandyOfferStatus",
});

@ObjectType({
  description:
    "1-3 candies offered for one candy of `wantSlug`, or of any kind. " +
    "Whose an offer is is not told: players find out whom they traded " +
    "with once they have.",
})
export class HalloweenCandyOffer {
  @Field(() => ID)
  id: string;

  @Field(() => String, {
    nullable: true,
    description:
      "The kind of candy asked for, by its slug. Null when any kind will do.",
  })
  wantSlug: string | null;

  @Field(() => HalloweenCandyOfferStatus)
  status: HalloweenCandyOfferStatus;

  @Field(() => [HalloweenCandy], {
    description: "What is offered. Empty once the offer is no longer open.",
  })
  candies: HalloweenCandy[];

  @Field(() => String, {
    nullable: true,
    description:
      "The event host, Daphne or Luther, who put up a house offer. Null on " +
      "a player's offer.",
  })
  host: string | null;

  @Field(() => Date, {
    nullable: true,
    description: "When a house offer closes. Null on a player's offer.",
  })
  expiresAt: Date | null;

  @Field()
  createdAt: Date;
}

@ObjectType({ description: "The candy swap's limits on offers" })
export class HalloweenCandySwapLimits {
  @Field(() => Int, {
    description: "The most offers one player may have open at once",
  })
  maxOpenOffers: number;

  @Field(() => Int, { description: "The most candies one offer may give" })
  maxOfferedCandies: number;
}

@ObjectType({ description: "A candy swap you took part in, as you saw it" })
export class HalloweenCandyTradeRecord {
  @Field(() => ID)
  id: string;

  @Field(() => User, {
    nullable: true,
    description:
      "Whom you traded with. Null for a house offer, or if their account " +
      "is gone.",
  })
  with: User | null;

  @Field(() => String, {
    nullable: true,
    description:
      "The host, Daphne or Luther, when the trade took a house offer",
  })
  host: string | null;

  @Field(() => [String], { description: "The slugs of the candies you gave" })
  gave: string[];

  @Field(() => [String], { description: "The slugs of the candies you got" })
  received: string[];

  @Field()
  createdAt: Date;
}

@ObjectType({
  description: "Another player's open offer, and whether you could take it",
})
export class HalloweenCandySwapListing {
  @Field(() => HalloweenCandyOffer)
  offer: HalloweenCandyOffer;

  @Field({
    description:
      "Whether you hold a spare candy that fills it: one of the kind asked " +
      "for, or for an offer for any kind, one of a kind it does not give",
  })
  canTake: boolean;
}

@ObjectType({ description: "What is on offer in a community's candy swap" })
export class HalloweenCandySwapMarket {
  @Field(() => [HalloweenCandySwapListing], {
    description:
      "A random handful of other players' and the house's open offers, the " +
      "ones you can take first",
  })
  listings: HalloweenCandySwapListing[];

  @Field(() => Int, {
    description:
      "How many open offers the listings are drawn from: everyone's here " +
      "but yours",
  })
  available: number;

  @Field(() => Int, {
    description: "How many of the available offers you can take",
  })
  readyToTrade: number;

  @Field(() => Int, {
    description: "How many offers are open here, yours included",
  })
  openOffers: number;

  @Field(() => Int, {
    description: "How many trades went through here in the last 24 hours",
  })
  tradesLastDay: number;
}

@ObjectType({
  description:
    "A candy swap that went through, as anyone in the community sees it",
})
export class HalloweenCandySwapTrade {
  @Field(() => ID)
  id: string;

  @Field(() => User, {
    nullable: true,
    description:
      "Whose offer was taken. Null for a house offer, or if their account " +
      "is gone.",
  })
  offerer: User | null;

  @Field(() => User, {
    nullable: true,
    description: "Who took the offer. Null if their account is gone.",
  })
  taker: User | null;

  @Field(() => String, {
    nullable: true,
    description: "The host, Daphne or Luther, when it was a house offer",
  })
  host: string | null;

  @Field(() => [String], {
    description: "The slugs of the candies the offer gave",
  })
  offered: string[];

  @Field(() => [String], {
    description: "The slugs of the candies the taker gave for them",
  })
  paid: string[];

  @Field()
  createdAt: Date;
}

@ObjectType({
  description:
    "An offer just placed, and the trade it made straight away if it met " +
    "its mirror: a one-for-one offer asking for what this one gives.",
})
export class HalloweenCandyOfferPlaced {
  @Field(() => HalloweenCandyOffer)
  offer: HalloweenCandyOffer;

  @Field(() => HalloweenCandyTradeRecord, { nullable: true })
  trade: HalloweenCandyTradeRecord | null;
}
