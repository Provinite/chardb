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
    description: "Whom you traded with. Null if their account is gone.",
  })
  with: User | null;

  @Field(() => [String], { description: "The slugs of the candies you gave" })
  gave: string[];

  @Field(() => [String], { description: "The slugs of the candies you got" })
  received: string[];

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
