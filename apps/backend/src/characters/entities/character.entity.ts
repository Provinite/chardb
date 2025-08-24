import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Visibility } from '@chardb/database';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../shared/entities/tag.entity';
import { Image } from '../../images/entities/image.entity';
import { Media } from '../../media/entities/media.entity';
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

  @Field({ nullable: true })
  species?: string;

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

  @Field(() => ID, { nullable: true, description: 'ID of the main media item for this character' })
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
  @Field(() => [CharacterTraitValue], { description: 'Trait values assigned to this character' })
  traitValues!: CharacterTraitValue[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  owner: User;

  @Field(() => User, { nullable: true })
  creator?: User;

  @Field(() => Media, { nullable: true, description: 'Main media item for this character (image or text)' })
  mainMedia?: Media;

  @Field(() => [CharacterTag], { nullable: true })
  tags_rel?: CharacterTag[];

  @Field(() => CharacterCount, { nullable: true })
  _count?: CharacterCount;


  // Social features
  @Field(() => Int)
  likesCount: number;

  @Field(() => Boolean)
  userHasLiked: boolean;
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