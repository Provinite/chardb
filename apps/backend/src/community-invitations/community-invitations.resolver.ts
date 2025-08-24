import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { CommunityInvitationsService } from './community-invitations.service';
import { CommunityInvitation, CommunityInvitationConnection } from './entities/community-invitation.entity';
import { CreateCommunityInvitationInput, RespondToCommunityInvitationInput } from './dto/community-invitation.dto';

@Resolver(() => CommunityInvitation)
export class CommunityInvitationsResolver {
  constructor(private readonly communityInvitationsService: CommunityInvitationsService) {}

  /** Create a new community invitation */
  @Mutation(() => CommunityInvitation, { description: 'Create a new community invitation' })
  createCommunityInvitation(
    @Args('createCommunityInvitationInput', { description: 'Community invitation creation data' }) 
    createCommunityInvitationInput: CreateCommunityInvitationInput,
  ): Promise<CommunityInvitation> {
    return this.communityInvitationsService.create(createCommunityInvitationInput);
  }

  /** Get all community invitations with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitations', description: 'Get all community invitations with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    return this.communityInvitationsService.findAll(first, after);
  }

  /** Get community invitations by community ID with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByCommunity', description: 'Get community invitations by community ID with pagination' })
  findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    return this.communityInvitationsService.findByCommunity(communityId, first, after);
  }

  /** Get community invitations by invitee ID with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByInvitee', description: 'Get community invitations by invitee ID with pagination' })
  findByInvitee(
    @Args('inviteeId', { type: () => ID, description: 'Invitee ID' })
    inviteeId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    return this.communityInvitationsService.findByInvitee(inviteeId, first, after);
  }

  /** Get community invitations by inviter ID with pagination */
  @Query(() => CommunityInvitationConnection, { name: 'communityInvitationsByInviter', description: 'Get community invitations by inviter ID with pagination' })
  findByInviter(
    @Args('inviterId', { type: () => ID, description: 'Inviter ID' })
    inviterId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community invitations to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityInvitationConnection> {
    return this.communityInvitationsService.findByInviter(inviterId, first, after);
  }

  /** Get a community invitation by ID */
  @Query(() => CommunityInvitation, { name: 'communityInvitationById', description: 'Get a community invitation by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Community invitation ID' }) 
    id: string,
  ): Promise<CommunityInvitation> {
    return this.communityInvitationsService.findOne(id);
  }

  /** Respond to a community invitation */
  @Mutation(() => CommunityInvitation, { description: 'Respond to a community invitation (accept or decline)' })
  respondToCommunityInvitation(
    @Args('id', { type: () => ID, description: 'Community invitation ID' }) 
    id: string,
    @Args('respondToCommunityInvitationInput', { description: 'Response data (accept or decline)' }) 
    respondToCommunityInvitationInput: RespondToCommunityInvitationInput,
  ): Promise<CommunityInvitation> {
    return this.communityInvitationsService.respond(id, respondToCommunityInvitationInput);
  }

  /** Remove a community invitation */
  @Mutation(() => CommunityInvitation, { description: 'Remove a community invitation' })
  removeCommunityInvitation(
    @Args('id', { type: () => ID, description: 'Community invitation ID' }) 
    id: string,
  ): Promise<CommunityInvitation> {
    return this.communityInvitationsService.remove(id);
  }
}