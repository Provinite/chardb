import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';
import { Community } from '../../communities/entities/community.entity';

@ObjectType()
export class ItemType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ID)
  communityId: string;

  @Field({ nullable: true })
  category?: string;

  @Field()
  isStackable: boolean;

  @Field(() => Int, { nullable: true })
  maxStackSize?: number;

  @Field()
  isTradeable: boolean;

  @Field()
  isConsumable: boolean;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  iconUrl?: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any; // JSON object

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
  @Field(() => Community, { nullable: true })
  community?: Community;
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
