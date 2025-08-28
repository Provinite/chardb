import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Visibility } from '@chardb/database';

// Register enum for GraphQL
registerEnumType(Visibility, {
  name: 'Visibility',
  description: 'Visibility levels for content',
});
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';

@ObjectType()
export class GalleryCount {
  @Field(() => Int)
  media: number;
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

  // Relations - handled by field resolvers
  @Field(() => ID)
  ownerId: string;

  @Field(() => ID, { nullable: true })
  characterId?: string;
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