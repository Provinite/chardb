import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { Community } from "../../communities/entities/community.entity";
import { CommunityColor } from "../../community-colors/entities/community-color.entity";
import { Image } from "../../images/entities/image.entity";
import { Currency } from "../../currencies/entities/currency.entity";
import { Species } from "../../species/entities/species.entity";
import { SpeciesVariant } from "../../species-variants/entities/species-variant.entity";

/** One currency and how much of it using this item pays. */
@ObjectType()
export class ItemUsePayoutComponent {
  @Field(() => ID)
  id: string;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Int)
  amount: number;
}

/**
 * What making a character with one of these is allowed to make.
 *
 * `species` and `variants` are both here rather than the species being read
 * off the first variant: a ticket names one species, and a reader deciding
 * whether it is worth trading for should not have to infer that.
 */
@ObjectType()
export class ItemUseMyoGrant {
  @Field(() => ID)
  id: string;

  @Field(() => Species)
  species: Species;

  @Field(() => [SpeciesVariant], {
    description:
      "Which variants a ticket of this type can make. Never empty -- a grant " +
      "with no variants is cleared rather than stored.",
  })
  variants: SpeciesVariant[];
}

/** One species an edit kit covers, and which of its variants. */
@ObjectType()
export class ItemUseTraitEditGrantSpecies {
  @Field(() => ID)
  id: string;

  @Field(() => Species)
  species: Species;

  @Field(() => [SpeciesVariant], {
    description:
      "Which variants of this species the kit is limited to. **Empty means " +
      "every variant**, including a character with no variant set at all.",
  })
  variants: SpeciesVariant[];
}

/**
 * Which characters an edit kit of this type can change the traits of.
 *
 * A list of species rather than one, which is the shape that makes this
 * different from an MYO grant: a kit can be good for several species at once,
 * each narrowed to its own variants or not narrowed at all.
 */
@ObjectType()
export class ItemUseTraitEditGrant {
  @Field(() => ID)
  id: string;

  @Field(() => [ItemUseTraitEditGrantSpecies], {
    description: "Never empty -- a grant covering nothing is cleared instead.",
  })
  species: ItemUseTraitEditGrantSpecies[];
}

/**
 * Where an item of this type moves a character, and what it can be spent on.
 *
 * Named for what it does rather than what it is usually sold as. A community
 * calls its item a Rare Upgrade Ticket; this cannot tell an upgrade from a
 * demotion, because a variant has a name and not a rank.
 */
@ObjectType()
export class ItemUseVariantChangeGrant {
  @Field(() => ID)
  id: string;

  @Field(() => Species, {
    description:
      "The species this can be spent on. Always the destination variant's " +
      "own species -- an item cannot move a character between species.",
  })
  species: Species;

  @Field(() => SpeciesVariant, {
    description:
      "What the character becomes. Exactly one, so a member never chooses.",
  })
  toVariant: SpeciesVariant;

  @Field(() => [SpeciesVariant], {
    description:
      "Which variants this can be spent on. **Empty means every variant** of " +
      "the species, including a character with no variant set at all.",
  })
  fromVariants: SpeciesVariant[];
}

/**
 * What one use produced.
 *
 * Returns the payout rather than just a boolean so the caller can say "you got
 * 100 HC" without a second round trip -- and the item it came from is gone by
 * then, so re-reading is not an option.
 */
@ObjectType()
export class UseItemResult {
  @Field({ description: "What was used up, for the message." })
  itemTypeName: string;

  @Field({
    description:
      "Shared by the USE row on the item ledger and every credit on the " +
      "currency ledger, so one use reads as one event.",
  })
  batchId: string;

  /**
   * What this use paid, if it paid anything.
   *
   * A sibling rather than the whole result: an MYO ticket will return a
   * character here beside an empty payout, and a trait-edit ticket the
   * character it changed. Adding those is an additive change to this type.
   */
  @Field(() => [ItemUsePayoutComponent])
  payout: ItemUsePayoutComponent[];
}

@ObjectType()
export class ItemType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  // Nullable columns are typed `| null` rather than only `?`, so a row read
  // straight from Prisma satisfies this without a cast. The two are the same
  // to GraphQL, and casting is how a missing non-nullable field reaches
  // serialisation unnoticed.
  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID)
  communityId: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field()
  isTradeable: boolean;

  @Field({
    description:
      "Whether a holder can use one up. Using destroys the item, which is " +
      "why anything with a payout must be consumable.",
  })
  isConsumable: boolean;

  // Optional in TypeScript, non-null in GraphQL: a field resolver always
  // supplies it, so nothing constructing an ItemType has to carry it. Same
  // arrangement as `community` above.
  @Field(() => [ItemUsePayoutComponent], {
    description:
      "What using one pays its holder. Empty when it pays nothing, which is " +
      "most item types.",
  })
  usePayout?: ItemUsePayoutComponent[];

  // Not a GraphQL field - used internally by field resolver
  imageId?: string | null;

  @Field(() => Image, { nullable: true })
  image?: Image | null;

  @Field(() => ID, { nullable: true })
  colorId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
  @Field(() => Community, { nullable: true })
  community?: Community;

  @Field(() => CommunityColor, { nullable: true })
  color?: CommunityColor;
}

@ObjectType()
export class ItemTypeConnection {
  @Field(() => [ItemType])
  itemTypes: ItemType[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}
