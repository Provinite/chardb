import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { SpeciesService } from './species.service';
import { Species, SpeciesConnection } from './entities/species.entity';
import { CreateSpeciesInput, UpdateSpeciesInput } from './dto/species.dto';

@Resolver(() => Species)
export class SpeciesResolver {
  constructor(private readonly speciesService: SpeciesService) {}

  /** Create a new species */
  @Mutation(() => Species, { description: 'Create a new species' })
  createSpecies(
    @Args('createSpeciesInput', { description: 'Species creation data' }) 
    createSpeciesInput: CreateSpeciesInput,
  ): Promise<Species> {
    return this.speciesService.create(createSpeciesInput);
  }

  /** Get all species with pagination */
  @Query(() => SpeciesConnection, { name: 'species', description: 'Get all species with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesConnection> {
    return this.speciesService.findAll(first, after);
  }

  /** Get species by community ID with pagination */
  @Query(() => SpeciesConnection, { name: 'speciesByCommunity', description: 'Get species by community ID with pagination' })
  findByCommunity(
    @Args('communityId', { type: () => ID, description: 'Community ID' })
    communityId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesConnection> {
    return this.speciesService.findByCommunity(communityId, first, after);
  }

  /** Get a species by ID */
  @Query(() => Species, { name: 'speciesById', description: 'Get a species by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
  ): Promise<Species> {
    return this.speciesService.findOne(id);
  }

  /** Update a species */
  @Mutation(() => Species, { description: 'Update a species' })
  updateSpecies(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
    @Args('updateSpeciesInput', { description: 'Species update data' }) 
    updateSpeciesInput: UpdateSpeciesInput,
  ): Promise<Species> {
    return this.speciesService.update(id, updateSpeciesInput);
  }

  /** Remove a species */
  @Mutation(() => Species, { description: 'Remove a species' })
  removeSpecies(
    @Args('id', { type: () => ID, description: 'Species ID' }) 
    id: string,
  ): Promise<Species> {
    return this.speciesService.remove(id);
  }
}