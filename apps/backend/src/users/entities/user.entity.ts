import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  username: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  dateOfBirth?: Date;

  @Field()
  isVerified: boolean;

  @Field()
  isAdmin: boolean;

  @Field(() => GraphQLJSON)
  privacySettings: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Social features
  @Field(() => Int)
  followersCount: number;

  @Field(() => Int)
  followingCount: number;

  @Field(() => Boolean)
  userIsFollowing: boolean;
}

@ObjectType()
export class UserConnection {
  @Field(() => [User])
  nodes: User[];

  @Field()
  totalCount: number;

  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;
}