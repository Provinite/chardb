import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";

@ObjectType()
export class Item {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  itemTypeId: string;

  @Field(() => ID, { nullable: true })
  ownerId?: string;

  @Field(() => Date, {
    nullable: true,
    description:
      "Set when the item was revoked or consumed. Destroyed items keep their " +
      "provenance but never appear in an inventory.",
  })
  destroyedAt?: Date | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

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
