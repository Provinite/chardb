import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { Visibility } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../shared/entities/tag.entity';

@ObjectType()
export class CharacterCount {
  @Field(() => Int)
  images: number;
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

  @Field(() => Visibility)
  visibility: Visibility;

  @Field()
  isSellable: boolean;

  @Field()
  isTradeable: boolean;

  @Field(() => Float, { nullable: true })
  price?: number;

  @Field(() => [String])
  tags: string[];

  @Field(() => String, { nullable: true })
  customFields?: string; // JSON string

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  owner: User;

  @Field(() => User, { nullable: true })
  creator?: User;

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