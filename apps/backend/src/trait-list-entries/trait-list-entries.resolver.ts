import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { TraitListEntriesService } from './trait-list-entries.service';
import { TraitListEntry, TraitListEntryConnection } from './entities/trait-list-entry.entity';
import { CreateTraitListEntryInput, UpdateTraitListEntryInput } from './dto/trait-list-entry.dto';
import {
  mapCreateTraitListEntryInputToService,
  mapUpdateTraitListEntryInputToService,
  mapPrismaTraitListEntryToGraphQL,
  mapPrismaTraitListEntryConnectionToGraphQL,
} from './utils/trait-list-entry-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { Trait } from '../traits/entities/trait.entity';
import { SpeciesVariant } from '../species-variants/entities/species-variant.entity';
import { TraitValueType } from '../shared/enums/trait-value-type.enum';

@Resolver(() => TraitListEntry)
export class TraitListEntriesResolver {
  constructor(private readonly traitListEntriesService: TraitListEntriesService) {}

  /** Create a new trait list entry */
  @Mutation(() => TraitListEntry, { description: 'Create a new trait list entry' })
  async createTraitListEntry(
    @Args('createTraitListEntryInput', { description: 'Trait list entry creation data' }) 
    createTraitListEntryInput: CreateTraitListEntryInput,
  ): Promise<TraitListEntry> {
    const serviceInput = mapCreateTraitListEntryInputToService(createTraitListEntryInput);
    const prismaResult = await this.traitListEntriesService.create(serviceInput);
    return mapPrismaTraitListEntryToGraphQL(prismaResult);
  }

  /** Get all trait list entries with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntries', description: 'Get all trait list entries with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    const serviceResult = await this.traitListEntriesService.findAll(first, after);
    return mapPrismaTraitListEntryConnectionToGraphQL(serviceResult);
  }

  /** Get trait list entries by species variant ID with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntriesBySpeciesVariant', description: 'Get trait list entries by species variant ID with pagination' })
  async findBySpeciesVariant(
    @Args('speciesVariantId', { type: () => ID, description: 'Species variant ID' })
    speciesVariantId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    const serviceResult = await this.traitListEntriesService.findBySpeciesVariant(speciesVariantId, first, after);
    return mapPrismaTraitListEntryConnectionToGraphQL(serviceResult);
  }

  /** Get trait list entries by trait ID with pagination */
  @Query(() => TraitListEntryConnection, { name: 'traitListEntriesByTrait', description: 'Get trait list entries by trait ID with pagination' })
  async findByTrait(
    @Args('traitId', { type: () => ID, description: 'Trait ID' })
    traitId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of trait list entries to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<TraitListEntryConnection> {
    const serviceResult = await this.traitListEntriesService.findByTrait(traitId, first, after);
    return mapPrismaTraitListEntryConnectionToGraphQL(serviceResult);
  }

  /** Get a trait list entry by ID */
  @Query(() => TraitListEntry, { name: 'traitListEntryById', description: 'Get a trait list entry by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
  ): Promise<TraitListEntry> {
    const prismaResult = await this.traitListEntriesService.findOne(id);
    return mapPrismaTraitListEntryToGraphQL(prismaResult);
  }

  /** Update a trait list entry */
  @Mutation(() => TraitListEntry, { description: 'Update a trait list entry' })
  async updateTraitListEntry(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
    @Args('updateTraitListEntryInput', { description: 'Trait list entry update data' }) 
    updateTraitListEntryInput: UpdateTraitListEntryInput,
  ): Promise<TraitListEntry> {
    const serviceInput = mapUpdateTraitListEntryInputToService(updateTraitListEntryInput);
    const prismaResult = await this.traitListEntriesService.update(id, serviceInput);
    return mapPrismaTraitListEntryToGraphQL(prismaResult);
  }

  /** Remove a trait list entry */
  @Mutation(() => RemovalResponse, { description: 'Remove a trait list entry' })
  async removeTraitListEntry(
    @Args('id', { type: () => ID, description: 'Trait list entry ID' }) 
    id: string,
  ): Promise<RemovalResponse> {
    await this.traitListEntriesService.remove(id);
    return { removed: true, message: 'Trait list entry successfully removed' };
  }

  // Field resolvers for relations
  @ResolveField('trait', () => Trait, { description: 'The trait this entry configures' })
  resolveTrait(@Parent() traitListEntry: TraitListEntry): Trait | null {
    // TODO: Implement when traits service is refactored
    return null;
  }

  @ResolveField('speciesVariant', () => SpeciesVariant, { description: 'The species variant this entry belongs to' })
  resolveSpeciesVariant(@Parent() traitListEntry: TraitListEntry): SpeciesVariant | null {
    // TODO: Implement when species-variants service is refactored
    return null;
  }

  // Field resolver for computed properties
  @ResolveField('defaultDisplayValue', () => String, { nullable: true, description: 'Display value for the default value based on type' })
  resolveDefaultDisplayValue(@Parent() traitListEntry: TraitListEntry): string | null {
    if (traitListEntry.valueType === TraitValueType.STRING) {
      return traitListEntry.defaultValueString || null;
    } else if (traitListEntry.valueType === TraitValueType.INTEGER) {
      return traitListEntry.defaultValueInt !== null && traitListEntry.defaultValueInt !== undefined ? String(traitListEntry.defaultValueInt) : null;
    } else if (traitListEntry.valueType === TraitValueType.TIMESTAMP) {
      return traitListEntry.defaultValueTimestamp ? traitListEntry.defaultValueTimestamp.toISOString() : null;
    } else {
      return null;
    }
  }
}