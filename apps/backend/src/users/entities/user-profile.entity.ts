import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from './user.entity';

@ObjectType()
export class UserStats {
  @Field(() => ID)
  userId: string;
}

@ObjectType()
export class UserProfile {
  @Field(() => User)
  user: User;

  @Field()
  isOwnProfile: boolean;

  @Field()
  canViewPrivateContent: boolean;
}
