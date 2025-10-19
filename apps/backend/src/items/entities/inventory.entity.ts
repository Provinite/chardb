import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Item as ItemEntity } from './item.entity';

/**
 * Represents a user's inventory within a specific community.
 * This is a conceptual entity - not backed by a database table.
 * It provides a clean GraphQL interface for accessing community-scoped items.
 */
@ObjectType()
export class Inventory {
  /** The community this inventory belongs to */
  @Field(() => ID)
  communityId: string;

  /** The items in this inventory */
  @Field(() => [ItemEntity])
  items: ItemEntity[];

  /** Total number of items in the inventory */
  @Field(() => Number)
  totalItems: number;
}
