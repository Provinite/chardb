import { ObjectType, Field, ID } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-type-json";
import { ExternalAccount } from "../../external-accounts/entities/external-account.entity";
import { CommunityMember } from "../../community-members/entities/community-member.entity";
import { Image } from "../../images/entities/image.entity";
import { ModerationStatus } from "@prisma/client";

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

  // Resolved by a field resolver, and only for the account it belongs to.
  // `avatarImage` above is null while the picture is unapproved, which on its
  // own is indistinguishable from having never set one; this says which.
  @Field(() => ModerationStatus, { nullable: true })
  avatarImageModerationStatus?: ModerationStatus;

  @Field({ nullable: true })
  website?: string;

  @Field({ nullable: true })
  dateOfBirth?: Date;

  @Field()
  isVerified: boolean;

  @Field()
  isAdmin: boolean;

  // `unknown` rather than a shape: the column is Json, Prisma hands it back as
  // `unknown` because it cannot know what was written, and nothing has
  // validated the rows already in the table. It is passed straight through to
  // GraphQLJSON, so claiming a shape here would assert something no code
  // checks. (Was `any`, which asserted the same thing and silenced the
  // checker as well.)
  @Field(() => GraphQLJSON)
  privacySettings: unknown;

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

  @Field(() => [CommunityMember], {
    description: "User's community memberships with roles",
  })
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
