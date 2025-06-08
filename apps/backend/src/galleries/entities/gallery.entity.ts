import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Visibility } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Image } from '../../images/entities/image.entity';

@ObjectType()
export class GalleryCount {
  @Field(() => Int)
  images: number;
}

@ObjectType()
export class Gallery {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Visibility)
  visibility: Visibility;

  @Field(() => Int)
  sortOrder: number;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  // Relations
  @Field(() => ID)
  ownerId: string;

  @Field(() => User)
  owner: User;

  @Field(() => ID, { nullable: true })
  characterId?: string;

  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => [Image])
  images: Image[];

  // Count fields
  @Field(() => GalleryCount, { nullable: true })
  _count?: GalleryCount;

  // Social features
  @Field(() => Int)
  likesCount: number;

  @Field(() => Boolean)
  userHasLiked: boolean;
}

@ObjectType()
export class GalleryConnection {
  @Field(() => [Gallery])
  galleries: Gallery[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}