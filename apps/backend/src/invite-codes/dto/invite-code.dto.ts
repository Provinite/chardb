import { InputType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsString,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

@InputType({ description: 'Input for creating a new invite code' })
export class CreateInviteCodeInput {
  /** The invite code string (alphanumeric and hyphens only) */
  @Field(() => String, {
    description: 'The invite code string (alphanumeric and hyphens only)',
  })
  @IsString()
  @MinLength(1, { message: 'Invite code cannot be empty' })
  @MaxLength(50, { message: 'Invite code cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Invite code can only contain letters, numbers, and hyphens',
  })
  id!: string;

  /** Maximum number of times this invite code can be claimed */
  @Field(() => Int, {
    description: 'Maximum number of times this invite code can be claimed',
  })
  @IsInt()
  @Min(1, { message: 'Max claims must be at least 1' })
  maxClaims!: number;

  /** The user who is creating this invite code */
  @Field(() => ID, {
    description: 'The ID of the user who is creating this invite code',
  })
  @IsUUID(4, { message: 'Creator ID must be a valid UUID' })
  creatorId!: string;

  /** The role to grant when this invite code is used (optional) */
  @Field(() => ID, {
    description: 'The ID of the role to grant when this invite code is used',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string | null;
}

@InputType({ description: 'Input for updating an existing invite code' })
export class UpdateInviteCodeInput {
  /** Maximum number of times this invite code can be claimed */
  @Field(() => Int, {
    description: 'Maximum number of times this invite code can be claimed',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Max claims must be at least 1' })
  maxClaims?: number;

  /** The role to grant when this invite code is used (optional) */
  @Field(() => ID, {
    description: 'The ID of the role to grant when this invite code is used',
    nullable: true,
  })
  @IsOptional()
  @IsUUID(4, { message: 'Role ID must be a valid UUID' })
  roleId?: string | null;
}

@InputType({ description: 'Input for claiming an invite code' })
export class ClaimInviteCodeInput {
  /** The user who is claiming this invite code */
  @Field(() => ID, {
    description: 'The ID of the user who is claiming this invite code',
  })
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId!: string;
}
