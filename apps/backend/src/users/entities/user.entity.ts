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

  // Identity permission fields (migrated from clovercoin-app)
  @Field()
  canCreateCommunity: boolean;

  @Field()
  canListUsers: boolean;

  @Field()
  canListInviteCodes: boolean;

  @Field()
  canCreateInviteCode: boolean;

  @Field()
  canGrantGlobalPermissions: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Social features handled by field resolvers
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