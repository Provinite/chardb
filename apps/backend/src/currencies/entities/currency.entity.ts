import { ObjectType, Field, ID, Int } from "@nestjs/graphql";

@ObjectType({
  description:
    "A community-defined unit of account. A community may define any number " +
    "of them; they never convert into one another and never leave their " +
    "community.",
})
export class Currency {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  communityId: string;

  @Field()
  name: string;

  @Field({
    description: 'Short display code, unique within the community: "HC".',
  })
  code: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Glyph rendered before the amount. Readers should fall back to the " +
      "code when this is null.",
  })
  symbol?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID, { nullable: true })
  colorId?: string | null;

  @Field(() => Date, {
    nullable: true,
    description:
      "When set, the currency takes no new transactions. Existing balances " +
      "and statements stay readable -- deleting it would destroy the history " +
      "of everything ever bought with it.",
  })
  archivedAt?: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType({
  description: "What a community's currency is doing, in aggregate.",
})
export class CurrencySupply {
  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int, {
    description:
      "Total held across every member. Coin at a sink has been burned, so " +
      "this is the whole supply, not a share of it.",
  })
  inCirculation: number;

  @Field(() => Int, {
    description: "Members holding a non-zero balance.",
  })
  holders: number;

  @Field(() => Int, { description: "Minted over the last 30 days." })
  mintedLast30Days: number;

  @Field(() => Int, {
    description:
      "Removed over the last 30 days, as a positive number. Burns and spends " +
      "together -- both leave circulation.",
  })
  removedLast30Days: number;

  @Field(() => Int, {
    description: "The largest single balance. Zero when nobody holds any.",
  })
  largestBalance: number;
}
