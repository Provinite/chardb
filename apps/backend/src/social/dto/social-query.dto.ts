import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class FollowListResult {
  @Field(() => User)
  user: User;

  @Field(() => [User])
  followers?: User[];

  @Field(() => [User])
  following?: User[];
}

@ObjectType()
export class ActivityContent {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;
}

@ObjectType()
export class ActivityItem {
  @Field()
  id: string;

  @Field()
  type: string;

  @Field()
  entityId: string;

  @Field()
  createdAt: Date;

  @Field(() => User)
  user: User;

  @Field(() => ActivityContent, { nullable: true })
  content?: ActivityContent;
}

@InputType()
export class ActivityFeedInput {
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
