import { ObjectType, Field, ID, Float, Int } from "@nestjs/graphql";
import { Visibility, ModerationStatus } from "@chardb/database";
import { Tag } from "../../shared/entities/tag.entity";
import { CharacterTraitValue } from "../../shared/types/character-trait.types";

@ObjectType()
export class CharacterCount {
  @Field(() => Int)
  media: number;
}

@ObjectType()
export class Character {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({
    nullable: true,
    description:
      "Official registry identifier for this character within its species",
  })
  registryId?: string;

  @Field(() => ID, {
    nullable: true,
    description: "ID of the species this character belongs to",
  })
  speciesId?: string;

  @Field(() => ID, {
    nullable: true,
    description: "ID of the species variant this character belongs to",
  })
  speciesVariantId?: string;

  @Field({ nullable: true })
  details?: string;

  @Field(() => ID, {
    nullable: true,
    description:
      "ID of the owner. Null for orphaned/community-owned characters.",
  })
  ownerId?: string;

  @Field({ description: "Whether this character is orphaned (no owner)" })
  isOrphaned: boolean;

  @Field(() => ID, { nullable: true })
  creatorId?: string;

  @Field(() => ID, {
    nullable: true,
    description: "ID of the main media item for this character",
  })
  mainMediaId?: string;

  @Field(() => Visibility)
  visibility: Visibility;

  @Field({ description: "For sale, in real money. Paired with `price`." })
  isSellable: boolean;

  @Field({
    description:
      "Open to trades for other characters. The only one of these flags the " +
      "trade system reads: it is consent to a real transfer, checked when an " +
      "offer is written and again when it settles.",
  })
  isTradeable: boolean;

  @Field({ description: "For sale, in a community's own currency." })
  isSellableForCoin: boolean;

  @Field({ description: "Open to trades for art." })
  isTradeableForArt: boolean;

  @Field({
    description: "Open to offers, without saying in advance what kind.",
  })
  isOpenToOffers: boolean;

  @Field({ description: "Free to a good home." })
  isFreebie: boolean;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => [String])
  tags?: string[];

  @Field(() => String, { nullable: true })
  customFields?: string; // JSON string

  /** Trait values assigned to this character */
  @Field(() => [CharacterTraitValue], {
    description: "Trait values assigned to this character",
  })
  traitValues!: CharacterTraitValue[];

  @Field(() => ModerationStatus, {
    nullable: true,
    description: "Trait review moderation status",
  })
  traitReviewStatus?: ModerationStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
}

@ObjectType()
export class CharacterTag {
  @Field(() => Character)
  character: Character;

  @Field(() => Tag)
  tag: Tag;
}

@ObjectType()
export class CharacterConnection {
  @Field(() => [Character])
  characters: Character[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}
