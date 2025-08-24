import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { CommunitiesService } from './communities.service';
import { Community, CommunityConnection } from './entities/community.entity';
import { CreateCommunityInput, UpdateCommunityInput } from './dto/community.dto';

@Resolver(() => Community)
export class CommunitiesResolver {
  constructor(private readonly communitiesService: CommunitiesService) {}

  /** Create a new community */
  @Mutation(() => Community, { description: 'Create a new community' })
  createCommunity(
    @Args('createCommunityInput', { description: 'Community creation data' }) 
    createCommunityInput: CreateCommunityInput,
  ): Promise<Community> {
    return this.communitiesService.create(createCommunityInput);
  }

  /** Get all communities with pagination */
  @Query(() => CommunityConnection, { name: 'communities', description: 'Get all communities with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of communities to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityConnection> {
    return this.communitiesService.findAll(first, after);
  }

  /** Get a community by ID */
  @Query(() => Community, { name: 'community', description: 'Get a community by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
  ): Promise<Community> {
    return this.communitiesService.findOne(id);
  }

  /** Update a community */
  @Mutation(() => Community, { description: 'Update a community' })
  updateCommunity(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
    @Args('updateCommunityInput', { description: 'Community update data' }) 
    updateCommunityInput: UpdateCommunityInput,
  ): Promise<Community> {
    return this.communitiesService.update(id, updateCommunityInput);
  }

  /** Remove a community */
  @Mutation(() => Community, { description: 'Remove a community' })
  removeCommunity(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
  ): Promise<Community> {
    return this.communitiesService.remove(id);
  }
}