import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { ExternalAccount } from "../../external-accounts/entities/external-account.entity";
import { CommunityMember } from "../../community-members/entities/community-member.entity";
import { Image } from "../../images/entities/image.entity";

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

  // Not a GraphQL field - used internally by field resolver
  avatarImageId?: string;

  @Field(() => Image, { nullable: true })
  avatarImage?: Image;

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

  @Field(() => [ExternalAccount])
  externalAccounts: ExternalAccount[];

  @Field(() => [CommunityMember], { description: "User's community memberships with roles" })
  communityMemberships: CommunityMember[];
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
