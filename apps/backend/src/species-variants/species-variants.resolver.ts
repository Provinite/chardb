import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { SpeciesVariantsService } from './species-variants.service';
import { SpeciesVariant, SpeciesVariantConnection } from './entities/species-variant.entity';
import { CreateSpeciesVariantInput, UpdateSpeciesVariantInput } from './dto/species-variant.dto';

@Resolver(() => SpeciesVariant)
export class SpeciesVariantsResolver {
  constructor(private readonly speciesVariantsService: SpeciesVariantsService) {}

  /** Create a new species variant */
  @Mutation(() => SpeciesVariant, { description: 'Create a new species variant' })
  createSpeciesVariant(
    @Args('createSpeciesVariantInput', { description: 'Species variant creation data' }) 
    createSpeciesVariantInput: CreateSpeciesVariantInput,
  ): Promise<SpeciesVariant> {
    return this.speciesVariantsService.create(createSpeciesVariantInput);
  }

  /** Get all species variants with pagination */
  @Query(() => SpeciesVariantConnection, { name: 'speciesVariants', description: 'Get all species variants with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species variants to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesVariantConnection> {
    return this.speciesVariantsService.findAll(first, after);
  }

  /** Get species variants by species ID with pagination */
  @Query(() => SpeciesVariantConnection, { name: 'speciesVariantsBySpecies', description: 'Get species variants by species ID with pagination' })
  findBySpecies(
    @Args('speciesId', { type: () => ID, description: 'Species ID' })
    speciesId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of species variants to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<SpeciesVariantConnection> {
    return this.speciesVariantsService.findBySpecies(speciesId, first, after);
  }

  /** Get a species variant by ID */
  @Query(() => SpeciesVariant, { name: 'speciesVariantById', description: 'Get a species variant by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
  ): Promise<SpeciesVariant> {
    return this.speciesVariantsService.findOne(id);
  }

  /** Update a species variant */
  @Mutation(() => SpeciesVariant, { description: 'Update a species variant' })
  updateSpeciesVariant(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
    @Args('updateSpeciesVariantInput', { description: 'Species variant update data' }) 
    updateSpeciesVariantInput: UpdateSpeciesVariantInput,
  ): Promise<SpeciesVariant> {
    return this.speciesVariantsService.update(id, updateSpeciesVariantInput);
  }

  /** Remove a species variant */
  @Mutation(() => SpeciesVariant, { description: 'Remove a species variant' })
  removeSpeciesVariant(
    @Args('id', { type: () => ID, description: 'Species variant ID' }) 
    id: string,
  ): Promise<SpeciesVariant> {
    return this.speciesVariantsService.remove(id);
  }
}