import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { TraitListEntriesService } from './trait-list-entries.service';
import { TraitListEntry, TraitListEntryConnection } from './entities/trait-list-entry.entity';
import { CreateTraitListEntryInput, UpdateTraitListEntryInput } from './dto/trait-list-entry.dto';

@Resolver(() => TraitListEntry)
export class TraitListEntriesResolver {
  constructor(private readonly traitListEntriesService: TraitListEntriesService) {}

  /** Create a new trait list entry */
  @Mutation(() => TraitListEntry, { description: 'Create a new trait list entry' })
  createTraitListEntry(
    @Args('createTraitListEntryInput', { description: 'Trait list entry creation data' }) 
    createTraitListEntryInput: CreateTraitListEntryInput,
  ): Promise<TraitListEntry> {
    return this.traitListEntriesService.create(createTraitListEntryInput);
  }

  /** Get all trait list entries with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntries', description: 'Get all trait list entries with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    return this.traitListEntriesService.findAll(first, after);
  }

  /** Get trait list entries by species variant ID with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntriesBySpeciesVariant', description: 'Get trait list entries by species variant ID with pagination' })
  findBySpeciesVariant(
    @Args('speciesVariantId', { type: () => ID, description: 'Species variant ID' })
    speciesVariantId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    return this.traitListEntriesService.findBySpeciesVariant(speciesVariantId, first, after);
  }

  /** Get trait list entries by trait ID with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntriesByTrait', description: 'Get trait list entries by trait ID with pagination' })
  findByTrait(
    @Args('traitId', { type: () => ID, description: 'Trait ID' })
    traitId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    return this.traitListEntriesService.findByTrait(traitId, first, after);
  }

  /** Get a trait list entry by ID */
  @Query(() => TraitListEntry, { name: 'traitListEntryById', description: 'Get a trait list entry by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
  ): Promise<TraitListEntry> {
    return this.traitListEntriesService.findOne(id);
  }

  /** Update a trait list entry */
  @Mutation(() => TraitListEntry, { description: 'Update a trait list entry' })
  updateTraitListEntry(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
    @Args('updateTraitListEntryInput', { description: 'Trait list entry update data' }) 
    updateTraitListEntryInput: UpdateTraitListEntryInput,
  ): Promise<TraitListEntry> {
    return this.traitListEntriesService.update(id, updateTraitListEntryInput);
  }

  /** Remove a trait list entry */
  @Mutation(() => TraitListEntry, { description: 'Remove a trait list entry' })
  removeTraitListEntry(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
  ): Promise<TraitListEntry> {
    return this.traitListEntriesService.remove(id);
  }
}