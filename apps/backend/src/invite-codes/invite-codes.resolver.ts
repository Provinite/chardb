import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { InviteCodesService } from './invite-codes.service';
import { RequireGlobalPermission } from '../auth/decorators/RequireGlobalPermission';
import { RequireAuthenticated } from '../auth/decorators/RequireAuthenticated';
import { GlobalPermission } from '../auth/GlobalPermission';
import { InviteCode, InviteCodeConnection } from './entities/invite-code.entity';
import { CreateInviteCodeInput, UpdateInviteCodeInput, ClaimInviteCodeInput } from './dto/invite-code.dto';
import {
  mapCreateInviteCodeInputToService,
  mapUpdateInviteCodeInputToService,
  mapClaimInviteCodeInputToService,
  mapPrismaInviteCodeToGraphQL,
  mapPrismaInviteCodeConnectionToGraphQL,
} from './utils/invite-code-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UsersService } from '../users/users.service';
import { mapPrismaUserToGraphQL } from '../users/utils/user-resolver-mappers';
import { RolesService } from '../roles/roles.service';
import { mapPrismaRoleToGraphQL } from '../roles/utils/role-resolver-mappers';

@Resolver(() => InviteCode)
export class InviteCodesResolver {
  constructor(
    private readonly inviteCodesService: InviteCodesService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @RequireGlobalPermission(GlobalPermission.CanCreateInviteCode)
  @Mutation(() => InviteCode, { description: 'Create a new invite code' })
  async createInviteCode(
    @Args('createInviteCodeInput', { description: 'Invite code creation data' })
    createInviteCodeInput: CreateInviteCodeInput,
  ): Promise<InviteCode> {
    const serviceInput = mapCreateInviteCodeInputToService(createInviteCodeInput);
    const prismaResult = await this.inviteCodesService.create(serviceInput);
    return mapPrismaInviteCodeToGraphQL(prismaResult);
  }

  /** Get all invite codes with pagination */
  @RequireGlobalPermission(GlobalPermission.CanListInviteCodes)
  @Query(() => InviteCodeConnection, { name: 'inviteCodes', description: 'Get all invite codes with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
    @Args('communityId', { type: () => ID, nullable: true, description: 'Community ID to filter by. If null, returns only global invite codes' })
    communityId?: string,
  ): Promise<InviteCodeConnection> {
    const serviceResult = await this.inviteCodesService.findAll(first, after, communityId);
    return mapPrismaInviteCodeConnectionToGraphQL(serviceResult);
  }

  /** Get invite codes by creator ID with pagination */
  @RequireGlobalPermission(GlobalPermission.CanListInviteCodes)
  @Query(() => InviteCodeConnection, { name: 'inviteCodesByCreator', description: 'Get invite codes by creator ID with pagination' })
  async findByCreator(
    @Args('creatorId', { type: () => ID, description: 'Creator ID' })
    creatorId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<InviteCodeConnection> {
    const serviceResult = await this.inviteCodesService.findByCreator(creatorId, first, after);
    return mapPrismaInviteCodeConnectionToGraphQL(serviceResult);
  }

  /** Get invite codes by role ID with pagination */
  @RequireGlobalPermission(GlobalPermission.CanListInviteCodes)
  @Query(() => InviteCodeConnection, { name: 'inviteCodesByRole', description: 'Get invite codes by role ID with pagination' })
  async findByRole(
    @Args('roleId', { type: () => ID, description: 'Role ID' })
    roleId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of invite codes to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<InviteCodeConnection> {
    const serviceResult = await this.inviteCodesService.findByRole(roleId, first, after);
    return mapPrismaInviteCodeConnectionToGraphQL(serviceResult);
  }

  /** Get an invite code by ID */
  @RequireGlobalPermission(GlobalPermission.CanListInviteCodes)
  @Query(() => InviteCode, { name: 'inviteCodeById', description: 'Get an invite code by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Invite code ID' })
    id: string,
  ): Promise<InviteCode> {
    const prismaResult = await this.inviteCodesService.findOne(id);
    return mapPrismaInviteCodeToGraphQL(prismaResult);
  }

  @RequireGlobalPermission(GlobalPermission.CanCreateInviteCode)
  @Mutation(() => InviteCode, { description: 'Update an invite code' })
  async updateInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' })
    id: string,
    @Args('updateInviteCodeInput', { description: 'Invite code update data' })
    updateInviteCodeInput: UpdateInviteCodeInput,
  ): Promise<InviteCode> {
    const serviceInput = mapUpdateInviteCodeInputToService(updateInviteCodeInput);
    const prismaResult = await this.inviteCodesService.update(id, serviceInput);
    return mapPrismaInviteCodeToGraphQL(prismaResult);
  }

  @RequireAuthenticated()
  @Mutation(() => InviteCode, { description: 'Claim an invite code to join a community' })
  async claimInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' })
    id: string,
    @Args('claimInviteCodeInput', { description: 'Invite code claim data' })
    claimInviteCodeInput: ClaimInviteCodeInput,
  ): Promise<InviteCode> {
    const serviceInput = mapClaimInviteCodeInputToService(claimInviteCodeInput);
    const prismaResult = await this.inviteCodesService.claim(id, serviceInput);
    return mapPrismaInviteCodeToGraphQL(prismaResult);
  }

  @RequireGlobalPermission(GlobalPermission.CanCreateInviteCode)
  @Mutation(() => RemovalResponse, { description: 'Remove an invite code' })
  async removeInviteCode(
    @Args('id', { type: () => ID, description: 'Invite code ID' })
    id: string,
  ): Promise<RemovalResponse> {
    await this.inviteCodesService.remove(id);
    return { removed: true, message: 'Invite code successfully removed' };
  }

  // Field resolvers for computed properties
  @ResolveField('isAvailable', () => Boolean, { description: 'Whether this invite code is still available for use' })
  resolveIsAvailable(@Parent() inviteCode: InviteCode): boolean {
    return inviteCode.claimCount < inviteCode.maxClaims;
  }

  @ResolveField('remainingClaims', () => Int, { description: 'Number of remaining uses for this invite code' })
  resolveRemainingClaims(@Parent() inviteCode: InviteCode): number {
    return Math.max(0, inviteCode.maxClaims - inviteCode.claimCount);
  }

  // Field resolvers for relations
  @ResolveField('creator', () => User, { description: 'The user who created this invite code' })
  async resolveCreator(@Parent() inviteCode: InviteCode): Promise<User | null> {
    const prismaUser = await this.usersService.findById(inviteCode.creatorId);
    return prismaUser ? mapPrismaUserToGraphQL(prismaUser) : null;
  }

  @ResolveField('role', () => Role, { description: 'The role to grant when this invite code is used', nullable: true })
  async resolveRole(@Parent() inviteCode: InviteCode): Promise<Role | null> {
    if (!inviteCode.roleId) {
      return null;
    }
    const prismaRole = await this.rolesService.findOne(inviteCode.roleId);
    return mapPrismaRoleToGraphQL(prismaRole);
  }
}