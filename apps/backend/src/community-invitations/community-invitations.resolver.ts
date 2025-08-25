import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { CommunityInvitationsService } from './community-invitations.service';
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

@Resolver(() => CommunityInvitation)
export class CommunityInvitationsResolver {
  constructor(private readonly communityInvitationsService: CommunityInvitationsService) {}

  /** Create a new community invitation */
  @Mutation(() => CommunityInvitation, { description: 'Create a new community invitation' })
  async createCommunityInvitation(
    @Args('createCommunityInvitationInput', { description: 'Community invitation creation data' }) 
    createCommunityInvitationInput: CreateCommunityInvitationInput,
  ): Promise<CommunityInvitation> {
    const serviceInput = mapCreateCommunityInvitationInputToService(createCommunityInvitationInput);
    const prismaResult = await this.communityInvitationsService.create(serviceInput);
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  /** Get all community invitations with pagination */
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

  /** Get community invitations by community ID with pagination */
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

  /** Get community invitations by invitee ID with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByInvitee', description: 'Get community invitations by invitee ID with pagination' })
  async findByInvitee(
    @Args('inviteeId', { type: () => ID, description: 'Invitee ID' })
    inviteeId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    const serviceResult = await this.communityInvitationsService.findByInvitee(inviteeId, first, after);
    return mapPrismaConnectionToGraphQL(serviceResult);
  }

  /** Get community invitations by inviter ID with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByInviter', description: 'Get community invitations by inviter ID with pagination' })
  async findByInviter(
    @Args('inviterId', { type: () => ID, description: 'Inviter ID' })
    inviterId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    const serviceResult = await this.communityInvitationsService.findByInviter(inviterId, first, after);
    return mapPrismaConnectionToGraphQL(serviceResult);
  }

  /** Get a community invitation by ID */
  @Query(() => CommunityInvitation, { name: 'communityInvitationById', description: 'Get a community invitation by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Community invitation ID' }) 
    id: string,
  ): Promise<CommunityInvitation> {
    const prismaResult = await this.communityInvitationsService.findOne(id);
    return mapPrismaCommunityInvitationToGraphQL(prismaResult);
  }

  /** Respond to a community invitation */
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

  /** Remove a community invitation */
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
  resolveRole(@Parent() invitation: CommunityInvitation): Role | null {
    // TODO: Implement when roles service is refactored
    return null;
  }

  @ResolveField('invitee', () => User, { nullable: true })
  resolveInvitee(@Parent() invitation: CommunityInvitation): User | null {
    // TODO: Implement when users service is refactored  
    return null;
  }

  @ResolveField('inviter', () => User, { nullable: true })
  resolveInviter(@Parent() invitation: CommunityInvitation): User | null {
    // TODO: Implement when users service is refactored
    return null;
  }

  @ResolveField('community', () => Community, { nullable: true })
  resolveCommunity(@Parent() invitation: CommunityInvitation): Community | null {
    // TODO: Implement when communities service is refactored
    return null;
  }
}