import { InputType, Field, ID } from '@nestjs/graphql';
import { IsUUID } from 'class-validator';

@InputType({ description: 'Input for creating a new community membership' })
export class CreateCommunityMemberInput {
  /** The role to assign to the member */
  @Field(() => ID, {
    description: 'The ID of the role to assign to the member',
  })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId!: string;

  /** The user to make a member */
  @Field(() => ID, { description: 'The ID of the user to make a member' })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId!: string;
}

@InputType({
  description: 'Input for updating an existing community membership',
})
export class UpdateCommunityMemberInput {
  /** The role to assign to the member */
  @Field(() => ID, {
    description: 'The ID of the role to assign to the member',
  })
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId!: string;
}
