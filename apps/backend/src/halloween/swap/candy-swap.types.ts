import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql";
import { HalloweenCandyOfferStatus } from "@chardb/database";
import { User } from "../../users/entities/user.entity";
import { HalloweenCandy } from "../board/candy-board.types";

registerEnumType(HalloweenCandyOfferStatus, {
  name: "HalloweenCandyOfferStatus",
});

@ObjectType({
  description:
    "1-3 candies offered for one candy of `wantSlug`. Whose an offer is " +
    "is not told: players find out whom they traded with once they have.",
})
export class HalloweenCandyOffer {
  @Field(() => ID)
  id: string;

  @Field({ description: "The kind of candy asked for, by its slug" })
  wantSlug: string;

  @Field(() => HalloweenCandyOfferStatus)
  status: HalloweenCandyOfferStatus;

  @Field(() => [HalloweenCandy], {
    description: "What is offered. Empty once the offer is no longer open.",
  })
  candies: HalloweenCandy[];

  @Field()
  createdAt: Date;
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
