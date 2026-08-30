import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ItemType } from "./item-type.entity";
import { Item } from "./item.entity";
import { User } from "../../users/entities/user.entity";

/**
 * What one member holds in one community.
 *
 * Grouped by item type, because that is how a person thinks about their own
 * inventory -- but every individual item is listed inside its group, because
 * items are individually tracked and each has its own history. A staff member
 * revoking two of someone's three potions has to be able to name which two.
 */

@ObjectType({ description: "Every item of one type that a member holds." })
export class MemberHolding {
  @Field(() => ItemType)
  itemType: ItemType;

  @Field(() => Int)
  count: number;

  @Field(() => [Item], {
    description:
      "The items themselves, oldest first. Each has its own provenance, so " +
      "they are listed rather than only counted.",
  })
  items: Item[];
}

@ObjectType({
  description:
    "One member's holdings in one community, with what they are still owed.",
})
export class MemberHoldingsReport {
  @Field(() => User)
  member: User;

  @Field(() => Int, { description: "Live items held, across every type." })
  totalItems: number;

  @Field(() => Int, { description: "Distinct item types held." })
  distinctTypes: number;

  @Field(() => Int, {
    description:
      "Items granted to an external account this member has linked, but not " +
      "yet claimed. Always 0 today -- claiming happens automatically on link " +
      "-- and present so the page can say so rather than stay silent.",
  })
  pendingItems: number;

  @Field(() => [MemberHolding], { description: "Largest holding first." })
  holdings: MemberHolding[];
}
