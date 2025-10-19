import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Visibility } from '@chardb/database';
import { Tag } from '../../shared/entities/tag.entity';
import { CharacterTraitValue } from '../../shared/types/character-trait.types';

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

  @Field(() => ID, {
    nullable: true,
    description: 'ID of the species this character belongs to',
  })
  speciesId?: string;

  @Field(() => ID, {
    nullable: true,
    description: 'ID of the species variant this character belongs to',
  })
  speciesVariantId?: string;

  @Field({ nullable: true })
  age?: string;

  @Field({ nullable: true })
  gender?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  personality?: string;

  @Field({ nullable: true })
  backstory?: string;

  @Field(() => ID)
  ownerId: string;

  @Field(() => ID, { nullable: true })
  creatorId?: string;

  @Field(() => ID, {
    nullable: true,
    description: 'ID of the main media item for this character',
  })
  mainMediaId?: string;

  @Field(() => Visibility)
  visibility: Visibility;

  @Field()
  isSellable: boolean;

  @Field()
  isTradeable: boolean;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => [String])
  tags?: string[];

  @Field(() => String, { nullable: true })
  customFields?: string; // JSON string

  /** Trait values assigned to this character */
  @Field(() => [CharacterTraitValue], {
    description: 'Trait values assigned to this character',
  })
  traitValues!: CharacterTraitValue[];

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
