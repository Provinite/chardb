import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID, IsBoolean } from 'class-validator';

@InputType({ description: 'Input for creating a new community invitation' })
export class CreateCommunityInvitationInput {
  /** The role to grant when the invitation is accepted */
  @Field(() => ID, {
    description: 'The ID of the role to grant when the invitation is accepted',
  })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId!: string;

  /** The user being invited */
  @Field(() => ID, { description: 'The ID of the user being invited' })
  @IsUUID(4, { message: 'Invitee ID must be a valid UUID' })
  inviteeId!: string;

  /** The user who is creating the invitation */
  @Field(() => ID, {
    description: 'The ID of the user who is creating the invitation',
  })
  @IsUUID(4, { message: 'Inviter ID must be a valid UUID' })
  inviterId!: string;

  /** The community the invitation is for */
  @Field(() => ID, {
    description: 'The ID of the community the invitation is for',
  })
  @IsUUID(4, { message: 'Community ID must be a valid UUID' })
  communityId!: string;
}

@InputType({ description: 'Input for responding to a community invitation' })
export class RespondToCommunityInvitationInput {
  /** Whether to accept (true) or decline (false) the invitation */
  @Field(() => Boolean, {
    description: 'Whether to accept (true) or decline (false) the invitation',
  })
  @IsBoolean()
  accept!: boolean;
}
