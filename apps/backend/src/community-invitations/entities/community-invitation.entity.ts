import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({
  description:
    'An invitation for a user to join a community with a specific role',
})
export class CommunityInvitation {
  @Field(() => ID, {
    description: 'Unique identifier for the community invitation',
  })
  id!: string;

  /** The role to grant when the invitation is accepted */
  @Field(() => ID, {
    description: 'The ID of the role to grant when the invitation is accepted',
  })
  roleId!: string;

  /** The user being invited */
  @Field(() => ID, { description: 'The ID of the user being invited' })
  inviteeId!: string;

  /** The user who created the invitation */
  @Field(() => ID, {
    description: 'The ID of the user who created the invitation',
  })
  inviterId!: string;

  /** The community the invitation is for */
  @Field(() => ID, {
    description: 'The ID of the community the invitation is for',
  })
  communityId!: string;

  /** When the invitation was accepted (null if not accepted) */
  @Field(() => Date, {
    description: 'When the invitation was accepted',
    nullable: true,
  })
  acceptedAt?: Date | null;

  /** When the invitation was declined (null if not declined) */
  @Field(() => Date, {
    description: 'When the invitation was declined',
    nullable: true,
  })
  declinedAt?: Date | null;

  /** When the invitation was created */
  @Field(() => Date, { description: 'When the invitation was created' })
  createdAt!: Date;

  // Computed properties and relations handled by field resolvers
}

@ObjectType({
  description:
    'Paginated list of community invitations with connection metadata',
})
export class CommunityInvitationConnection {
  /** The community invitations in this page */
  @Field(() => [CommunityInvitation], {
    description: 'The community invitations in this page',
  })
  nodes!: CommunityInvitation[];

  /** Total count of community invitations matching the query */
  @Field(() => Number, {
    description: 'Total count of community invitations matching the query',
  })
  totalCount!: number;

  /** Whether there are more community invitations after this page */
  @Field(() => Boolean, {
    description: 'Whether there are more community invitations after this page',
  })
  hasNextPage!: boolean;

  /** Whether there are community invitations before this page */
  @Field(() => Boolean, {
    description: 'Whether there are community invitations before this page',
  })
  hasPreviousPage!: boolean;
}
