import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { CommunityMembersService } from './community-members.service';
import { CommunityMember, CommunityMemberConnection } from './entities/community-member.entity';
import { CreateCommunityMemberInput, UpdateCommunityMemberInput } from './dto/community-member.dto';

@Resolver(() => CommunityMember)
export class CommunityMembersResolver {
  constructor(private readonly communityMembersService: CommunityMembersService) {}

  /** Create a new community membership */
  @Mutation(() => CommunityMember, { description: 'Create a new community membership' })
  createCommunityMember(
    @Args('createCommunityMemberInput', { description: 'Community membership creation data' }) 
    createCommunityMemberInput: CreateCommunityMemberInput,
  ): Promise<CommunityMember> {
    return this.communityMembersService.create(createCommunityMemberInput);
  }

  /** Get all community members with pagination */
  @Query(() => CommunityMemberConnection, { name: 'communityMembers', description: 'Get all community members with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community members to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    return this.communityMembersService.findAll(first, after);
  }

  /** Get community members by community ID with pagination */
  @Query(() => CommunityMemberConnection, { name: 'communityMembersByCommunity', description: 'Get community members by community ID with pagination' })
  findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community members to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    return this.communityMembersService.findByCommunity(communityId, first, after);
  }

  /** Get community members by user ID with pagination */
  @Query(() => CommunityMemberConnection, { name: 'communityMembersByUser', description: 'Get community members by user ID with pagination' })
  findByUser(
    @Args('userId', { type: () => ID, description: 'User ID' })
    userId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of community members to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityMemberConnection> {
    return this.communityMembersService.findByUser(userId, first, after);
  }

  /** Get a community member by ID */
  @Query(() => CommunityMember, { name: 'communityMemberById', description: 'Get a community member by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Community member ID' }) 
    id: string,
  ): Promise<CommunityMember> {
    return this.communityMembersService.findOne(id);
  }

  /** Update a community membership */
  @Mutation(() => CommunityMember, { description: 'Update a community membership (change role)' })
  updateCommunityMember(
    @Args('id', { type: () => ID, description: 'Community member ID' }) 
    id: string,
    @Args('updateCommunityMemberInput', { description: 'Community membership update data' }) 
    updateCommunityMemberInput: UpdateCommunityMemberInput,
  ): Promise<CommunityMember> {
    return this.communityMembersService.update(id, updateCommunityMemberInput);
  }

  /** Remove a community membership */
  @Mutation(() => CommunityMember, { description: 'Remove a community membership' })
  removeCommunityMember(
    @Args('id', { type: () => ID, description: 'Community member ID' }) 
    id: string,
  ): Promise<CommunityMember> {
    return this.communityMembersService.remove(id);
  }
}