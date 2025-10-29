import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Community } from '../../communities/entities/community.entity';

@ObjectType()
export class CommunityColor {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  hexCode: string;

  @Field(() => ID)
  communityId: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations handled by field resolvers
  @Field(() => Community, { nullable: true })
  community?: Community;
}
