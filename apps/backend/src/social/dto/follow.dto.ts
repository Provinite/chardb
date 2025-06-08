import { InputType, Field, ID, ObjectType } from '@nestjs/graphql';
import { IsString, IsNotEmpty } from 'class-validator';

@InputType()
export class ToggleFollowInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

@ObjectType()
export class FollowResult {
  @Field()
  isFollowing: boolean;

  @Field()
  followersCount: number;

  @Field()
  followingCount: number;

  @Field(() => ID)
  targetUserId: string;
}

@ObjectType()
export class FollowStatus {
  @Field()
  isFollowing: boolean;

  @Field()
  followersCount: number;

  @Field()
  followingCount: number;
}