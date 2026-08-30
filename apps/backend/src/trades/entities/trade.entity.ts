import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { TradeStatus } from "@chardb/database";
import { User } from "../../users/entities/user.entity";
import { Community } from "../../communities/entities/community.entity";
import { Item } from "../../items/entities/item.entity";
import { ItemType } from "../../items/entities/item-type.entity";
import { Currency } from "../../currencies/entities/currency.entity";

registerEnumType(TradeStatus, {
  name: "TradeStatus",
  description: "Where an offer stands, before expiry is taken into account.",
});

/**
 * The status a reader should act on.
 *
 * `TradeStatus` has no EXPIRED member because expiry is a date, not something
 * written to a row. This adds it back for readers, who care that an offer has
 * lapsed and not that no job has been along to say so.
 */
export enum EffectiveTradeStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

registerEnumType(EffectiveTradeStatus, {
  name: "EffectiveTradeStatus",
  description:
    "Where an offer stands with the clock applied. A PENDING trade past its " +
    "expiresAt reports EXPIRED and will not settle.",
});

@ObjectType({
  description:
    "One line on the table: either a specific item, or a quantity of an item " +
    "type that any rows can satisfy.",
})
export class TradeItem {
  @Field(() => ID)
  id: string;

  @Field(() => Item, {
    nullable: true,
    description:
      "The exact row this line names. Set when the history of a particular " +
      "item is the point, and on everything the proposer offers.",
  })
  item?: Item | null;

  @Field(() => ItemType, {
    nullable: true,
    description:
      "The type this line asks for, when any rows of it will do. Paired with " +
      "quantity, and always something the recipient hands over.",
  })
  itemType?: ItemType | null;

  @Field(() => Int, {
    nullable: true,
    description: "How many of itemType. Null on a line that names a row.",
  })
  quantity?: number | null;

  @Field(() => User, { description: "Who hands it over." })
  sourceUser: User;

  @Field(() => User, { description: "Who receives it." })
  destinationUser: User;
}

@ObjectType({ description: "Coin on the table, moving one way." })
export class TradeCurrencyLine {
  @Field(() => ID)
  id: string;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int, {
    description:
      "Always positive. Direction is the source and destination, not a sign. " +
      "Opposing amounts in one currency are netted when the offer is written.",
  })
  amount: number;

  @Field(() => User)
  sourceUser: User;

  @Field(() => User)
  destinationUser: User;
}

@ObjectType({
  description:
    "One member's offer to another. Nothing is held while it stands: what it " +
    "names is checked when it is written and checked again, decisively, when " +
    "it is accepted.",
})
export class Trade {
  @Field(() => ID)
  id: string;

  @Field(() => Community)
  community: Community;

  @Field(() => User)
  proposer: User;

  @Field(() => User)
  recipient: User;

  @Field(() => EffectiveTradeStatus, {
    description:
      "Use this rather than a stored status: it accounts for expiry, which is " +
      "a date and never written to the row.",
  })
  status: EffectiveTradeStatus;

  @Field(() => String, { nullable: true })
  note?: string | null;

  @Field(() => Date)
  expiresAt: Date;

  @Field(() => Date, { nullable: true })
  respondedAt?: Date | null;

  @Field(() => String, {
    nullable: true,
    description:
      "Shared by every ledger row this settlement wrote, on both the item and " +
      "the currency ledger. Null until accepted.",
  })
  settlementBatchId?: string | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => [TradeItem])
  items: TradeItem[];

  @Field(() => [TradeCurrencyLine])
  currencyLines: TradeCurrencyLine[];
}

@ObjectType({ description: "A page of trades, newest first." })
export class TradeConnection {
  @Field(() => [Trade])
  nodes: Trade[];

  @Field(() => Int)
  totalCount: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}
