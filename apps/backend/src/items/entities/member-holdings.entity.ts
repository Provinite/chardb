import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { ItemType } from "./item-type.entity";
import { Item } from "./item.entity";
import { User } from "../../users/entities/user.entity";
import { PendingOwnership } from "../../pending-ownership/entities/pending-ownership.entity";

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

@ObjectType({
  description: "A character waiting on an external account to be claimed.",
})
export class PendingCharacter {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

/**
 * An external member's pending inventory: everything that waits on one
 * external account in one community -- someone with no account here, such as
 * an event winner known only by Discord (#445).
 */
@ObjectType({
  description:
    "Live, unclaimed items and characters held for one external account in " +
    "one community.",
})
export class PendingHoldingsReport {
  @Field(() => PendingOwnership, {
    description:
      "Who they are waiting for. Its id and names are blank to viewers who " +
      "may not see them, like any pending owner's.",
  })
  holder: PendingOwnership;

  @Field(() => Int)
  totalItems: number;

  @Field(() => Int)
  distinctTypes: number;

  @Field(() => [MemberHolding], { description: "Largest holding first." })
  holdings: MemberHolding[];

  @Field(() => [PendingCharacter], { description: "By name." })
  characters: PendingCharacter[];
}

@ObjectType({
  description:
    "Someone something waits on in a community without an account here.",
})
export class ExternalMember {
  @Field(() => PendingOwnership, {
    description:
      "Their most recent waiting claim, carrying the names last recorded for " +
      "them. Blank to viewers who may not see who holds what.",
  })
  holder: PendingOwnership;

  @Field(() => Int, { description: "Live items waiting on them." })
  itemCount: number;

  @Field(() => Int, { description: "Characters waiting on them." })
  characterCount: number;
}

@ObjectType()
export class ExternalMembersPage {
  @Field(() => [ExternalMember], { description: "Newest waiting claim first." })
  members: ExternalMember[];

  @Field()
  hasMore: boolean;
}
