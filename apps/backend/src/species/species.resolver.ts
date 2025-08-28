import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { SpeciesService } from './species.service';
import { Species, SpeciesConnection } from './entities/species.entity';
import { CreateSpeciesInput, UpdateSpeciesInput } from './dto/species.dto';
import {
  mapCreateSpeciesInputToService,
  mapUpdateSpeciesInputToService,
  mapPrismaSpeciesToGraphQL,
  mapPrismaSpeciesConnectionToGraphQL,
} from './utils/species-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { Community } from '../communities/entities/community.entity';
import { CommunitiesService } from '../communities/communities.service';
import { mapPrismaCommunityToGraphQL } from '../communities/utils/community-resolver-mappers';

@Resolver(() => Species)
export class SpeciesResolver {
  constructor(
    private readonly speciesService: SpeciesService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  /** Create a new species */
  @Mutation(() => Species, { description: 'Create a new species' })
  async createSpecies(
    @Args('createSpeciesInput', { description: 'Species creation data' }) 
    createSpeciesInput: CreateSpeciesInput,
  ): Promise<Species> {
    const serviceInput = mapCreateSpeciesInputToService(createSpeciesInput);
    const prismaResult = await this.speciesService.create(serviceInput);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  /** Get all species with pagination */
  @Query(() => SpeciesConnection, { name: 'species', description: 'Get all species with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesConnection> {
    const serviceResult = await this.speciesService.findAll(first, after);
    return mapPrismaSpeciesConnectionToGraphQL(serviceResult);
  }

  /** Get species by community ID with pagination */
  @Query(() => SpeciesConnection, { name: 'speciesByCommunity', description: 'Get species by community ID with pagination' })
  async findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesConnection> {
    const serviceResult = await this.speciesService.findByCommunity(communityId, first, after);
    return mapPrismaSpeciesConnectionToGraphQL(serviceResult);
  }

  /** Get a species by ID */
  @Query(() => Species, { name: 'speciesById', description: 'Get a species by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
  ): Promise<Species> {
    const prismaResult = await this.speciesService.findOne(id);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  /** Update a species */
  @Mutation(() => Species, { description: 'Update a species' })
  async updateSpecies(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
    @Args('updateSpeciesInput', { description: 'Species update data' }) 
    updateSpeciesInput: UpdateSpeciesInput,
  ): Promise<Species> {
    const serviceInput = mapUpdateSpeciesInputToService(updateSpeciesInput);
    const prismaResult = await this.speciesService.update(id, serviceInput);
    return mapPrismaSpeciesToGraphQL(prismaResult);
  }

  /** Remove a species */
  @Mutation(() => RemovalResponse, { description: 'Remove a species' })
  async removeSpecies(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
  ): Promise<RemovalResponse> {
    await this.speciesService.remove(id);
    return { removed: true, message: 'Species successfully removed' };
  }

  // Field resolver for relations
  @ResolveField('community', () => Community, { description: 'The community that owns this species' })
  async resolveCommunity(@Parent() species: Species): Promise<Community | null> {
    try {
      const prismaResult = await this.communitiesService.findOne(species.communityId);
      return mapPrismaCommunityToGraphQL(prismaResult);
    } catch (error) {
      return null;
    }
  }
}