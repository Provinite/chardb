import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { TraitsService } from './traits.service';
import { Trait, TraitConnection } from './entities/trait.entity';
import { CreateTraitInput, UpdateTraitInput } from './dto/trait.dto';

@Resolver(() => Trait)
export class TraitsResolver {
  constructor(private readonly traitsService: TraitsService) {}

  /** Create a new trait */
  @Mutation(() => Trait, { description: 'Create a new trait' })
  createTrait(
    @Args('createTraitInput', { description: 'Trait creation data' }) 
    createTraitInput: CreateTraitInput,
  ): Promise<Trait> {
    return this.traitsService.create(createTraitInput);
  }

  /** Get all traits with pagination */
  @Query(() => TraitConnection, { name: 'traits', description: 'Get all traits with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of traits to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitConnection> {
    return this.traitsService.findAll(first, after);
  }

  /** Get traits by species ID with pagination */
  @Query(() => TraitConnection, { name: 'traitsBySpecies', description: 'Get traits by species ID with pagination' })
  findBySpecies(
    @Args('speciesId', { type: () => ID, description: 'Species ID' })
    speciesId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of traits to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitConnection> {
    return this.traitsService.findBySpecies(speciesId, first, after);
  }

  /** Get a trait by ID */
  @Query(() => Trait, { name: 'traitById', description: 'Get a trait by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Trait ID' }) 
    id: string,
  ): Promise<Trait> {
    return this.traitsService.findOne(id);
  }

  /** Update a trait */
  @Mutation(() => Trait, { description: 'Update a trait' })
  updateTrait(
    @Args('id', { type: () => ID, description: 'Trait ID' }) 
    id: string,
    @Args('updateTraitInput', { description: 'Trait update data' }) 
    updateTraitInput: UpdateTraitInput,
  ): Promise<Trait> {
    return this.traitsService.update(id, updateTraitInput);
  }

  /** Remove a trait */
  @Mutation(() => Trait, { description: 'Remove a trait' })
  removeTrait(
    @Args('id', { type: () => ID, description: 'Trait ID' }) 
    id: string,
  ): Promise<Trait> {
    return this.traitsService.remove(id);
  }
}