import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { NotFoundException } from '@nestjs/common';
import { TraitsService } from './traits.service';
import { AllowAnyAuthenticated } from '../auth/decorators/AllowAnyAuthenticated';
import { AllowGlobalAdmin } from '../auth/decorators/AllowGlobalAdmin';
import { AllowCommunityPermission } from '../auth/decorators/AllowCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { CommunityPermission } from '../auth/CommunityPermission';
import { Trait, TraitConnection } from './entities/trait.entity';
import { CreateTraitInput, UpdateTraitInput } from './dto/trait.dto';
import {
  mapCreateTraitInputToService,
  mapUpdateTraitInputToService,
  mapPrismaTraitToGraphQL,
  mapPrismaTraitConnectionToGraphQL,
} from './utils/trait-resolver-mappers';
import { Species } from '../species/entities/species.entity';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { SpeciesService } from '../species/species.service';
import { mapPrismaSpeciesToGraphQL } from '../species/utils/species-resolver-mappers';
import { EnumValue } from '../enum-values/entities/enum-value.entity';
import { EnumValuesService } from '../enum-values/enum-values.service';
import { mapPrismaEnumValueToGraphQL } from '../enum-values/utils/enum-value-resolver-mappers';
import { TraitValueType } from '../shared/enums/trait-value-type.enum';

@Resolver(() => Trait)
export class TraitsResolver {
  constructor(
    private readonly traitsService: TraitsService,
    private readonly speciesService: SpeciesService,
    private readonly enumValuesService: EnumValuesService,
  ) {}

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ speciesId: 'createTraitInput.speciesId' })
  @Mutation(() => Trait, { description: 'Create a new trait' })
  async createTrait(
    @Args('createTraitInput', { description: 'Trait creation data' })
    createTraitInput: CreateTraitInput,
  ): Promise<Trait> {
    const serviceInput = mapCreateTraitInputToService(createTraitInput);
    const prismaResult = await this.traitsService.create(serviceInput);
    return mapPrismaTraitToGraphQL(prismaResult);
  }

  /** Get all traits with pagination */
  @AllowAnyAuthenticated()
  @Query(() => TraitConnection, {
    name: 'traits',
    description: 'Get all traits with pagination',
  })
  async findAll(
    @Args('first', {
      type: () => Int,
      nullable: true,
      description: 'Number of traits to return',
      defaultValue: 20,
    })
    first?: number,
    @Args('after', {
      type: () => String,
      nullable: true,
      description: 'Cursor for pagination',
    })
    after?: string,
  ): Promise<TraitConnection> {
    const serviceResult = await this.traitsService.findAll(first, after);
    return mapPrismaTraitConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ speciesId: 'speciesId' })
  @Query(() => TraitConnection, {
    name: 'traitsBySpecies',
    description: 'Get traits by species ID with pagination',
  })
  async findBySpecies(
    @Args('speciesId', { type: () => ID, description: 'Species ID' })
    speciesId: string,
    @Args('first', {
      type: () => Int,
      nullable: true,
      description: 'Number of traits to return',
      defaultValue: 20,
    })
    first?: number,
    @Args('after', {
      type: () => String,
      nullable: true,
      description: 'Cursor for pagination',
    })
    after?: string,
  ): Promise<TraitConnection> {
    const serviceResult = await this.traitsService.findBySpecies(
      speciesId,
      first,
      after,
    );
    return mapPrismaTraitConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ traitId: 'id' })
  @Query(() => Trait, { name: 'traitById', description: 'Get a trait by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Trait ID' })
    id: string,
  ): Promise<Trait> {
    const prismaResult = await this.traitsService.findOne(id);
    return mapPrismaTraitToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ traitId: 'id' })
  @Mutation(() => Trait, { description: 'Update a trait' })
  async updateTrait(
    @Args('id', { type: () => ID, description: 'Trait ID' })
    id: string,
    @Args('updateTraitInput', { description: 'Trait update data' })
    updateTraitInput: UpdateTraitInput,
  ): Promise<Trait> {
    const serviceInput = mapUpdateTraitInputToService(updateTraitInput);
    const prismaResult = await this.traitsService.update(id, serviceInput);
    return mapPrismaTraitToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ traitId: 'id' })
  @Mutation(() => RemovalResponse, { description: 'Remove a trait' })
  async removeTrait(
    @Args('id', { type: () => ID, description: 'Trait ID' })
    id: string,
  ): Promise<RemovalResponse> {
    await this.traitsService.remove(id);
    return { removed: true, message: 'Trait successfully removed' };
  }

  // Field resolvers for relations
  @ResolveField('species', () => Species, {
    description: 'The species this trait belongs to',
  })
  async resolveSpecies(@Parent() trait: Trait): Promise<Species | null> {
    try {
      const prismaResult = await this.speciesService.findOne(trait.speciesId);
      return mapPrismaSpeciesToGraphQL(prismaResult);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @ResolveField('enumValues', () => [EnumValue], {
    description: 'Enum values for this trait (only populated for ENUM traits)',
  })
  async resolveEnumValues(@Parent() trait: Trait): Promise<EnumValue[]> {
    // Only fetch enum values for ENUM traits
    if (trait.valueType !== TraitValueType.ENUM) {
      return [];
    }

    const serviceResult = await this.enumValuesService.findByTrait(
      trait.id,
      100,
    ); // Get up to 100 enum values
    return serviceResult.nodes.map(mapPrismaEnumValueToGraphQL);
  }
}
