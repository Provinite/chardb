import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { CommunitiesService } from './communities.service';
import { Community, CommunityConnection } from './entities/community.entity';
import { CreateCommunityInput, UpdateCommunityInput } from './dto/community.dto';
import {
  mapCreateCommunityInputToService,
  mapUpdateCommunityInputToService,
  mapPrismaCommunityToGraphQL,
  mapPrismaCommunityConnectionToGraphQL,
} from './utils/community-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';

@Resolver(() => Community)
export class CommunitiesResolver {
  constructor(private readonly communitiesService: CommunitiesService) {}

  /** Create a new community */
  @Mutation(() => Community, { description: 'Create a new community' })
  async createCommunity(
    @Args('createCommunityInput', { description: 'Community creation data' }) 
    createCommunityInput: CreateCommunityInput,
  ): Promise<Community> {
    const serviceInput = mapCreateCommunityInputToService(createCommunityInput);
    const prismaResult = await this.communitiesService.create(serviceInput);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  /** Get all communities with pagination */
  @Query(() => CommunityConnection, { name: 'communities', description: 'Get all communities with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of communities to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<CommunityConnection> {
    const serviceResult = await this.communitiesService.findAll(first, after);
    return mapPrismaCommunityConnectionToGraphQL(serviceResult);
  }

  /** Get a community by ID */
  @Query(() => Community, { name: 'community', description: 'Get a community by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
  ): Promise<Community> {
    const prismaResult = await this.communitiesService.findOne(id);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  /** Update a community */
  @Mutation(() => Community, { description: 'Update a community' })
  async updateCommunity(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
    @Args('updateCommunityInput', { description: 'Community update data' }) 
    updateCommunityInput: UpdateCommunityInput,
  ): Promise<Community> {
    const serviceInput = mapUpdateCommunityInputToService(updateCommunityInput);
    const prismaResult = await this.communitiesService.update(id, serviceInput);
    return mapPrismaCommunityToGraphQL(prismaResult);
  }

  /** Remove a community */
  @Mutation(() => RemovalResponse, { description: 'Remove a community' })
  async removeCommunity(
    @Args('id', { type: () => ID, description: 'Community ID' }) 
    id: string,
  ): Promise<RemovalResponse> {
    await this.communitiesService.remove(id);
    return { removed: true, message: 'Community successfully removed' };
  }
}