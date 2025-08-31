import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { NotFoundException } from '@nestjs/common';
import { SpeciesVariantsService } from './species-variants.service';
import { SpeciesVariant, SpeciesVariantConnection } from './entities/species-variant.entity';
import { CreateSpeciesVariantInput, UpdateSpeciesVariantInput } from './dto/species-variant.dto';
import {
  mapCreateSpeciesVariantInputToService,
  mapUpdateSpeciesVariantInputToService,
  mapPrismaSpeciesVariantToGraphQL,
  mapPrismaSpeciesVariantConnectionToGraphQL,
} from './utils/species-variant-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { Species } from '../species/entities/species.entity';
import { SpeciesService } from '../species/species.service';
import { mapPrismaSpeciesToGraphQL } from '../species/utils/species-resolver-mappers';

@Resolver(() => SpeciesVariant)
export class SpeciesVariantsResolver {
  constructor(
    private readonly speciesVariantsService: SpeciesVariantsService,
    private readonly speciesService: SpeciesService,
  ) {}

  /** Create a new species variant */
  @Mutation(() => SpeciesVariant, { description: 'Create a new species variant' })
  async createSpeciesVariant(
    @Args('createSpeciesVariantInput', { description: 'Species variant creation data' }) 
    createSpeciesVariantInput: CreateSpeciesVariantInput,
  ): Promise<SpeciesVariant> {
    const serviceInput = mapCreateSpeciesVariantInputToService(createSpeciesVariantInput);
    const prismaResult = await this.speciesVariantsService.create(serviceInput);
    return mapPrismaSpeciesVariantToGraphQL(prismaResult);
  }

  /** Get all species variants with pagination */
  @Query(() => SpeciesVariantConnection, { name: 'speciesVariants', description: 'Get all species variants with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species variants to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesVariantConnection> {
    const serviceResult = await this.speciesVariantsService.findAll(first, after);
    return mapPrismaSpeciesVariantConnectionToGraphQL(serviceResult);
  }

  /** Get species variants by species ID with pagination */
  @Query(() => SpeciesVariantConnection, { name: 'speciesVariantsBySpecies', description: 'Get species variants by species ID with pagination' })
  async findBySpecies(
    @Args('speciesId', { type: () => ID, description: 'Species ID' })
    speciesId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species variants to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesVariantConnection> {
    const serviceResult = await this.speciesVariantsService.findBySpecies(speciesId, first, after);
    return mapPrismaSpeciesVariantConnectionToGraphQL(serviceResult);
  }

  /** Get a species variant by ID */
  @Query(() => SpeciesVariant, { name: 'speciesVariantById', description: 'Get a species variant by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
  ): Promise<SpeciesVariant> {
    const prismaResult = await this.speciesVariantsService.findOne(id);
    return mapPrismaSpeciesVariantToGraphQL(prismaResult);
  }

  /** Update a species variant */
  @Mutation(() => SpeciesVariant, { description: 'Update a species variant' })
  async updateSpeciesVariant(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
    @Args('updateSpeciesVariantInput', { description: 'Species variant update data' }) 
    updateSpeciesVariantInput: UpdateSpeciesVariantInput,
  ): Promise<SpeciesVariant> {
    const serviceInput = mapUpdateSpeciesVariantInputToService(updateSpeciesVariantInput);
    const prismaResult = await this.speciesVariantsService.update(id, serviceInput);
    return mapPrismaSpeciesVariantToGraphQL(prismaResult);
  }

  /** Remove a species variant */
  @Mutation(() => RemovalResponse, { description: 'Remove a species variant' })
  async removeSpeciesVariant(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
  ): Promise<RemovalResponse> {
    await this.speciesVariantsService.remove(id);
    return { removed: true, message: 'Species variant successfully removed' };
  }

  // Field resolver for relations
  @ResolveField('species', () => Species, { description: 'The species this variant belongs to' })
  async resolveSpecies(@Parent() speciesVariant: SpeciesVariant): Promise<Species | null> {
    try {
      const prismaResult = await this.speciesService.findOne(speciesVariant.speciesId);
      return mapPrismaSpeciesToGraphQL(prismaResult);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}