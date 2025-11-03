import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { ItemType } from "./item-type.entity";
import { User } from "../../users/entities/user.entity";

@ObjectType()
export class Item {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  itemTypeId: string;

  @Field(() => ID, { nullable: true })
  ownerId?: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: any; // JSON object

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
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
