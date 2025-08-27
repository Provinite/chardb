import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';

@ObjectType({ description: 'An invite code that can be used to join a community with an optional role' })
export class InviteCode {
  @Field(() => ID, { description: 'The unique invite code string' })
  id!: string;

  /** Number of times this invite code has been claimed */
  @Field(() => Int, { description: 'Number of times this invite code has been claimed' })
  claimCount!: number;

  /** Maximum number of times this invite code can be claimed */
  @Field(() => Int, { description: 'Maximum number of times this invite code can be claimed' })
  maxClaims!: number;

  /** The user who created this invite code */
  @Field(() => ID, { description: 'The ID of the user who created this invite code' })
  creatorId!: string;

  /** The role to grant when this invite code is used (optional) */
  @Field(() => ID, { description: 'The ID of the role to grant when this invite code is used', nullable: true })
  roleId?: string | null;

  /** When the invite code was created */
  @Field(() => Date, { description: 'When the invite code was created' })
  createdAt!: Date;

  /** When the invite code was last updated */
  @Field(() => Date, { description: 'When the invite code was last updated' })
  updatedAt!: Date;
}

@ObjectType({ description: 'Paginated list of invite codes with connection metadata' })
export class InviteCodeConnection {
  /** The invite codes in this page */
  @Field(() => [InviteCode], { description: 'The invite codes in this page' })
  nodes!: InviteCode[];

  /** Total count of invite codes matching the query */
  @Field(() => Number, { description: 'Total count of invite codes matching the query' })
  totalCount!: number;

  /** Whether there are more invite codes after this page */
  @Field(() => Boolean, { description: 'Whether there are more invite codes after this page' })
  hasNextPage!: boolean;

  /** Whether there are invite codes before this page */
  @Field(() => Boolean, { description: 'Whether there are invite codes before this page' })
  hasPreviousPage!: boolean;
}