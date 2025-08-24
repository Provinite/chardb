import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { InviteCodesService } from './invite-codes.service';
import { InviteCode, InviteCodeConnection } from './entities/invite-code.entity';
import { CreateInviteCodeInput, UpdateInviteCodeInput, ClaimInviteCodeInput } from './dto/invite-code.dto';

@Resolver(() => InviteCode)
export class InviteCodesResolver {
  constructor(private readonly inviteCodesService: InviteCodesService) {}

  /** Create a new invite code */
  @Mutation(() => InviteCode, { description: 'Create a new invite code' })
  createInviteCode(
    @Args('createInviteCodeInput', { description: 'Invite code creation data' }) 
    createInviteCodeInput: CreateInviteCodeInput,
  ): Promise<InviteCode> {
    return this.inviteCodesService.create(createInviteCodeInput);
  }

  /** Get all invite codes with pagination */
  @Query(() => InviteCodeConnection, { name: 'inviteCodes', description: 'Get all invite codes with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<InviteCodeConnection> {
    return this.inviteCodesService.findAll(first, after);
  }

  /** Get invite codes by creator ID with pagination */
  @Query(() => InviteCodeConnection, { name: 'inviteCodesByCreator', description: 'Get invite codes by creator ID with pagination' })
  findByCreator(
    @Args('creatorId', { type: () => ID, description: 'Creator ID' })
    creatorId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<InviteCodeConnection> {
    return this.inviteCodesService.findByCreator(creatorId, first, after);
  }

  /** Get invite codes by role ID with pagination */
  @Query(() => InviteCodeConnection, { name: 'inviteCodesByRole', description: 'Get invite codes by role ID with pagination' })
  findByRole(
    @Args('roleId', { type: () => ID, description: 'Role ID' })
    roleId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<InviteCodeConnection> {
    return this.inviteCodesService.findByRole(roleId, first, after);
  }

  /** Get an invite code by ID */
  @Query(() => InviteCode, { name: 'inviteCodeById', description: 'Get an invite code by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Invite code ID' }) 
    id: string,
  ): Promise<InviteCode> {
    return this.inviteCodesService.findOne(id);
  }

  /** Update an invite code */
  @Mutation(() => InviteCode, { description: 'Update an invite code' })
  updateInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' }) 
    id: string,
    @Args('updateInviteCodeInput', { description: 'Invite code update data' }) 
    updateInviteCodeInput: UpdateInviteCodeInput,
  ): Promise<InviteCode> {
    return this.inviteCodesService.update(id, updateInviteCodeInput);
  }

  /** Claim an invite code */
  @Mutation(() => InviteCode, { description: 'Claim an invite code to join a community' })
  claimInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' }) 
    id: string,
    @Args('claimInviteCodeInput', { description: 'Invite code claim data' }) 
    claimInviteCodeInput: ClaimInviteCodeInput,
  ): Promise<InviteCode> {
    return this.inviteCodesService.claim(id, claimInviteCodeInput);
  }

  /** Remove an invite code */
  @Mutation(() => InviteCode, { description: 'Remove an invite code' })
  removeInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' }) 
    id: string,
  ): Promise<InviteCode> {
    return this.inviteCodesService.remove(id);
  }
}