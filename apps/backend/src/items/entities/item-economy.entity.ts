import { ObjectType, Field, Int } from "@nestjs/graphql";
import { ItemType } from "./item-type.entity";

/**
 * What a community's item catalogue actually looks like in use.
 *
 * The admin items page has always listed item types; it has never said how many
 * exist, who holds them, or whether anything needs attention. These are the
 * numbers a staff member checks before granting more of something.
 */

@ObjectType({ description: "One item type, and how it is doing." })
export class ItemTypeEconomy {
  @Field(() => ItemType)
  itemType: ItemType;

  @Field(() => Int, {
    description: "Live items of this type. Destroyed ones are not counted.",
  })
  circulation: number;

  @Field(() => Int, {
    description:
      "Distinct members holding at least one. Lower than circulation " +
      "whenever somebody holds several.",
  })
  holderCount: number;

  @Field(() => Int, { description: "Items granted in the last 30 days." })
  grantedRecently: number;

  @Field(() => Int, { description: "Items revoked in the last 30 days." })
  revokedRecently: number;

  @Field(() => Int, {
    description:
      "Granted to an external account that was never linked. These are held, " +
      "not lost -- but nobody has them.",
  })
  unclaimed: number;
}

@ObjectType({
  description: "Item circulation across a whole community, by item type.",
})
export class ItemEconomyReport {
  @Field(() => Int, { description: "Live items across every type." })
  totalCirculation: number;

  @Field(() => Int, {
    description: "Distinct members holding at least one item of any type.",
  })
  totalHolders: number;

  @Field(() => Int, { description: "Unclaimed items across every type." })
  totalUnclaimed: number;

  @Field(() => Int, {
    description:
      "Granted minus revoked over the last 30 days. Negative means the " +
      "community took more back than it gave out.",
  })
  netRecently: number;

  @Field(() => [ItemTypeEconomy], {
    description: "Largest circulation first.",
  })
  itemTypes: ItemTypeEconomy[];
}
