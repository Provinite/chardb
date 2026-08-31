import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { Currency } from "../../currencies/entities/currency.entity";
import { ItemType } from "../../items/entities/item-type.entity";
import { User } from "../../users/entities/user.entity";

/**
 * Whether a line still stands, for filtering a history.
 *
 * Deliberately the two states a stored column can answer for. "Refundable" is
 * a per-viewer judgement made from the clock and the item's fate, so it is a
 * badge on a row rather than something to filter a query by.
 */
export enum ShopPurchaseLineStatus {
  ACTIVE = "ACTIVE",
  REFUNDED = "REFUNDED",
}

registerEnumType(ShopPurchaseLineStatus, {
  name: "ShopPurchaseLineStatus",
  description: "Whether a purchase line still stands or has been refunded.",
});

@ObjectType({ description: "One currency a price option asks for." })
export class ShopPriceComponent {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  currencyId: string;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int)
  amount: number;
}

@ObjectType({
  description:
    "One way to pay for a listing. A buyer picks exactly one option and pays " +
    "all of its components -- mixing across options is not a thing.",
})
export class ShopPrice {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => [ShopPriceComponent])
  components: ShopPriceComponent[];

  @Field(() => Boolean, {
    description:
      "Whether the viewer currently holds enough of every currency this " +
      "option asks for. Advisory -- checkout is what actually decides.",
  })
  affordable: boolean;
}

@ObjectType({
  description: "Something a community sells for its own currency.",
})
export class ShopItem {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  communityId: string;

  @Field(() => ID)
  itemTypeId: string;

  @Field(() => ItemType)
  itemType: ItemType;

  @Field(() => String, {
    nullable: true,
    description: "Falls back to the item type's name when unset.",
  })
  name?: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Int, {
    nullable: true,
    description:
      "Null means unlimited. Zero means sold out, which is not the same as " +
      "unavailable -- a sold-out listing still says what it was.",
  })
  stock?: number | null;

  @Field(() => Int, {
    nullable: true,
    description: "Null means no cap. Counted across every purchase.",
  })
  maxPerUser?: number | null;

  @Field()
  active: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => [ShopPrice])
  prices: ShopPrice[];

  @Field(() => Int, {
    description:
      "How many of this the viewer already holds against its cap. Refunded " +
      "purchases do not count.",
  })
  purchasedByViewer: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType({ description: "What one unit of a purchase cost, at the time." })
export class ShopPurchaseLineCost {
  @Field(() => ID)
  currencyId: string;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int)
  amount: number;
}

@ObjectType({
  description:
    "One unit bought: one item, at one price, once. Quantity lives in the " +
    "number of these rather than a column, so a refund can name exactly what " +
    "it gave back.",
})
export class ShopPurchaseLine {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  purchaseId: string;

  @Field(() => ShopItem)
  shopItem: ShopItem;

  @Field(() => [ShopPurchaseLineCost], {
    description:
      "What was actually paid, copied at checkout. A later price change does " +
      "not alter what a refund returns.",
  })
  costs: ShopPurchaseLineCost[];

  @Field(() => Date, { nullable: true })
  refundedAt?: Date | null;

  @Field(() => User, { nullable: true })
  refundedBy?: User | null;

  @Field(() => Boolean, {
    description:
      "Whether the viewer can undo this right now. False once the window has " +
      "passed, once it is already refunded, or once the item has been used, " +
      "destroyed or handed on.",
  })
  refundableByViewer: boolean;

  @Field(() => String, {
    nullable: true,
    description: "Why it cannot be undone, when it cannot.",
  })
  refundBlockedReason?: string | null;

  @Field(() => Date, {
    description:
      "When the checkout that produced this line happened. Carried on the " +
      "line so a flat history can be dated without loading its purchase.",
  })
  purchasedAt: Date;

  @Field()
  createdAt: Date;
}

@ObjectType({ description: "One checkout." })
export class ShopPurchase {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  communityId: string;

  @Field(() => ID)
  buyerId: string;

  @Field(() => User, {
    nullable: true,
    description: "Who bought it. What a staff view is looking at.",
  })
  buyer?: User | null;

  @Field(() => [ShopPurchaseLine])
  lines: ShopPurchaseLine[];

  @Field()
  createdAt: Date;
}

@ObjectType({
  description:
    "A page of the viewer's own purchase lines, newest first, with the total " +
    "matching the same filters so a caller can say what it is showing part of.",
})
export class ShopPurchaseLineConnection {
  @Field(() => [ShopPurchaseLine])
  lines: ShopPurchaseLine[];

  @Field(() => Int, {
    description: "Every line matching the filters, not just this page.",
  })
  total: number;

  @Field()
  hasMore: boolean;
}
