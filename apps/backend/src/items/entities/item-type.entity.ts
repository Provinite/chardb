import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { Community } from "../../communities/entities/community.entity";
import { CommunityColor } from "../../community-colors/entities/community-color.entity";
import { Image } from "../../images/entities/image.entity";

@ObjectType()
export class ItemType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  // Nullable columns are typed `| null` rather than only `?`, so a row read
  // straight from Prisma satisfies this without a cast. The two are the same
  // to GraphQL, and casting is how a missing non-nullable field reaches
  // serialisation unnoticed.
  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ID)
  communityId: string;

  @Field(() => String, { nullable: true })
  category?: string | null;

  @Field()
  isTradeable: boolean;

  @Field()
  isConsumable: boolean;

  // Not a GraphQL field - used internally by field resolver
  imageId?: string | null;

  @Field(() => Image, { nullable: true })
  image?: Image | null;

  @Field(() => ID, { nullable: true })
  colorId?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
  @Field(() => Community, { nullable: true })
  community?: Community;

  @Field(() => CommunityColor, { nullable: true })
  color?: CommunityColor;
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
