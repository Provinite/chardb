import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { Currency } from "./currency.entity";

@ObjectType({
  description: "What one member holds of one currency.",
})
export class CurrencyBalance {
  @Field(() => ID)
  id: string;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => ID)
  userId: string;

  @Field(() => Int)
  amount: number;

  @Field()
  updatedAt: Date;
}

@ObjectType({
  description:
    "Every currency in a community alongside what this member holds of it, " +
    "including the ones they hold none of.\n\n" +
    "Currencies with a zero balance are included deliberately: a wallet that " +
    "hides them cannot tell a member that a currency exists, which is exactly " +
    "what they need to know before they can earn any.",
})
export class MemberWallet {
  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  communityId: string;

  @Field(() => [CurrencyBalanceLine])
  balances: CurrencyBalanceLine[];
}

@ObjectType()
export class CurrencyBalanceLine {
  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int, {
    description: "Zero when the member has never held any of this currency.",
  })
  amount: number;

  @Field(() => Date, {
    nullable: true,
    description: "When this balance last moved. Null if it never has.",
  })
  updatedAt?: Date | null;
}
