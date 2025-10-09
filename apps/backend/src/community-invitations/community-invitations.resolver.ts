import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { ForbiddenException } from '@nestjs/common';
import { CommunityInvitationsService } from './community-invitations.service';
import { RequireAuthenticated } from '../auth/decorators/RequireAuthenticated';
import { RequireGlobalAdmin } from '../auth/decorators/RequireGlobalAdmin';
import { RequireCommunityPermission } from '../auth/decorators/RequireCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { RequireOwnership } from '../auth/decorators/RequireOwnership';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommunityPermission } from '../auth/CommunityPermission';
import { AuthenticatedCurrentUserType } from '../auth/types/current-user.type';
import { CommunityInvitation, CommunityInvitationConnection } from './entities/community-invitation.entity';
import { CreateCommunityInvitationInput, RespondToCommunityInvitationInput } from './dto/community-invitation.dto';
import {
  mapCreateCommunityInvitationInputToService,
  mapRespondToCommunityInvitationInputToService,
  mapPrismaCommunityInvitationToGraphQL,
  mapPrismaConnectionToGraphQL,
} from './utils/community-invitation-resolver-mappers';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Community } from '../communities/entities/community.entity';
import { RolesService } from '../roles/roles.service';
import { mapPrismaRoleToGraphQL } from '../roles/utils/role-resolver-mappers';
import { UsersService } from '../users/users.service';
import { mapPrismaUserToGraphQL } from '../users/utils/user-resolver-mappers';
import { CommunitiesService } from '../communities/communities.service';
import { mapPrismaCommunityToGraphQL } from '../communities/utils/community-resolver-mappers';

@Resolver(() => CommunityInvitation)
export class CommunityInvitationsResolver {
  constructor(
    private readonly communityInvitationsService: CommunityInvitationsService,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanCreateInviteCode)
  @ResolveCommunityFrom({ communityId: 'createCommunityInvitationInput.communityId' })
  @Mutation(() => CommunityInvitation, { description: 'Create a new community invitation' })
  async createCommunityInvitation(
    @Args('createCommunityInvitationInput', { description: 'Community invitation creation data' })
    createCommunityInvitationInput: CreateCommunityInvitationInput,
  ): Promise<CommunityInvitation> {
    const serviceInput = mapCreateCommunityInvitationInputToService(createCommunityInvitationInput);
    const prismaResult = await this.communityInvitationsService.create(serviceInput);
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  @RequireGlobalAdmin()
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitations', description: 'Get all community invitations with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    const serviceResult = await this.communityInvitationsService.findAll(first, after);
    return mapPrismaConnectionToGraphQL(serviceResult);
  }

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanCreateInviteCode)
  @ResolveCommunityFrom({ communityId: 'communityId' })
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByCommunity', description: 'Get community invitations by community ID with pagination' })
  async findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    const serviceResult = await this.communityInvitationsService.findByCommunity(communityId, first, after);
    return mapPrismaConnectionToGraphQL(serviceResult);
  }

  @RequireAuthenticated()
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByInvitee', description: 'Get community invitations by invitee ID with pagination' })
  async findByInvitee(
    @Args('inviteeId', { type: () => ID, description: 'Invitee ID' })
    inviteeId: string,
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    // Self OR Admin check
    if (!currentUser.isAdmin && inviteeId !== currentUser.id) {
      throw new ForbiddenException('You can only view your own invitations unless you are an admin');
    }
    const serviceResult = await this.communityInvitationsService.findByInvitee(inviteeId, first, after);
    return mapPrismaConnectionToGraphQL(serviceResult);
  }

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanCreateInviteCode)
  @ResolveCommunityFrom({ communityInvitationId: 'id' })
  @Query(() => CommunityInvitation, { name: 'communityInvitationById', description: 'Get a community invitation by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Community invitation ID' })
    id: string,
    @CurrentUser() currentUser: AuthenticatedCurrentUserType,
  ): Promise<CommunityInvitation> {
    const prismaResult = await this.communityInvitationsService.findOne(id);

    // Allow if user is invitee or inviter (in addition to admin/permission checks from decorators)
    if (prismaResult.inviteeId === currentUser.id || prismaResult.inviterId === currentUser.id) {
      return mapPrismaCommunityInvitationToGraphQL(prismaResult);
    }

    // Otherwise, decorators will enforce Admin OR CanCreateInviteCode permission
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  /** Respond to a community invitation */
  @RequireOwnership({ inviteeOfInvitationId: 'id' })
  @Mutation(() => CommunityInvitation, { description: 'Respond to a community invitation (accept or decline)' })
  async respondToCommunityInvitation(
    @Args('id', { type: () => ID, description: 'Community invitation ID' })
    id: string,
    @Args('respondToCommunityInvitationInput', { description: 'Response data (accept or decline)' })
    respondToCommunityInvitationInput: RespondToCommunityInvitationInput,
  ): Promise<CommunityInvitation> {
    const serviceInput = mapRespondToCommunityInvitationInputToService(respondToCommunityInvitationInput);
    const prismaResult = await this.communityInvitationsService.respond(id, serviceInput);
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ inviterOrInviteeOfInvitationId: 'id' })
  @Mutation(() => CommunityInvitation, { description: 'Remove a community invitation' })
  async removeCommunityInvitation(
    @Args('id', { type: () => ID, description: 'Community invitation ID' })
    id: string,
  ): Promise<CommunityInvitation> {
    const prismaResult = await this.communityInvitationsService.remove(id);
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  // Field resolvers for computed properties
  @ResolveField('accepted', () => Boolean, { description: 'Whether the invitation has been accepted' })
  resolveAccepted(@Parent() invitation: CommunityInvitation): boolean {
    return Boolean(invitation.acceptedAt);
  }

  @ResolveField('declined', () => Boolean, { description: 'Whether the invitation has been declined' })
  resolveDeclined(@Parent() invitation: CommunityInvitation): boolean {
    return Boolean(invitation.declinedAt);
  }

  @ResolveField('pending', () => Boolean, { description: 'Whether the invitation is still pending' })
  resolvePending(@Parent() invitation: CommunityInvitation): boolean {
    return !invitation.acceptedAt && !invitation.declinedAt;
  }

  // Field resolvers for relations - these would fetch the related entities
  // For now, returning null until other services are refactored
  @ResolveField('role', () => Role, { nullable: true })
  async resolveRole(@Parent() invitation: CommunityInvitation): Promise<Role> {
    const prismaRole = await this.rolesService.findOne(invitation.roleId);
    return mapPrismaRoleToGraphQL(prismaRole);
  }

  @ResolveField('invitee', () => User, { nullable: true })
  async resolveInvitee(@Parent() invitation: CommunityInvitation): Promise<User | null> {
    const prismaUser = await this.usersService.findById(invitation.inviteeId);
    return prismaUser ? mapPrismaUserToGraphQL(prismaUser) : null;
  }

  @ResolveField('inviter', () => User, { nullable: true })
  async resolveInviter(@Parent() invitation: CommunityInvitation): Promise<User | null> {
    const prismaUser = await this.usersService.findById(invitation.inviterId);
    return prismaUser ? mapPrismaUserToGraphQL(prismaUser) : null;
  }

  @ResolveField('community', () => Community, { nullable: true })
  async resolveCommunity(@Parent() invitation: CommunityInvitation): Promise<Community> {
    const prismaCommunity = await this.communitiesService.findOne(invitation.communityId);
    return mapPrismaCommunityToGraphQL(prismaCommunity);
  }
}