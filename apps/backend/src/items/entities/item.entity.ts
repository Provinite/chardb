import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ItemType } from './item-type.entity';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Item {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  itemTypeId: string;

  @Field(() => ID)
  ownerId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => String, { nullable: true })
  metadata?: string; // JSON string

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
  @Field(() => ItemType)
  itemType: ItemType;

  @Field(() => User)
  owner: User;
}

@ObjectType()
export class ItemConnection {
  @Field(() => [Item])
  items: Item[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}
