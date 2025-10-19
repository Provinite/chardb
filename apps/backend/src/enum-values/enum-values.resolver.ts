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
import { EnumValuesService } from './enum-values.service';
import { AllowAnyAuthenticated } from '../auth/decorators/AllowAnyAuthenticated';
import { AllowGlobalAdmin } from '../auth/decorators/AllowGlobalAdmin';
import { AllowCommunityPermission } from '../auth/decorators/AllowCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { CommunityPermission } from '../auth/CommunityPermission';
import { EnumValue, EnumValueConnection } from './entities/enum-value.entity';
import {
  CreateEnumValueInput,
  UpdateEnumValueInput,
} from './dto/enum-value.dto';
import {
  mapCreateEnumValueInputToService,
  mapUpdateEnumValueInputToService,
  mapPrismaEnumValueToGraphQL,
  mapPrismaEnumValueConnectionToGraphQL,
} from './utils/enum-value-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { Trait } from '../traits/entities/trait.entity';
import { TraitsService } from '../traits/traits.service';
import { mapPrismaTraitToGraphQL } from '../traits/utils/trait-resolver-mappers';

@Resolver(() => EnumValue)
export class EnumValuesResolver {
  constructor(
    private readonly enumValuesService: EnumValuesService,
    private readonly traitsService: TraitsService,
  ) {}

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ traitId: 'createEnumValueInput.traitId' })
  @Mutation(() => EnumValue, { description: 'Create a new enum value' })
  async createEnumValue(
    @Args('createEnumValueInput', { description: 'Enum value creation data' })
    createEnumValueInput: CreateEnumValueInput,
  ): Promise<EnumValue> {
    const serviceInput = mapCreateEnumValueInputToService(createEnumValueInput);
    const prismaResult = await this.enumValuesService.create(serviceInput);
    return mapPrismaEnumValueToGraphQL(prismaResult);
  }

  /** Get all enum values with pagination */
  @AllowAnyAuthenticated()
  @Query(() => EnumValueConnection, {
    name: 'enumValues',
    description: 'Get all enum values with pagination',
  })
  async findAll(
    @Args('first', {
      type: () => Int,
      nullable: true,
      description: 'Number of enum values to return',
      defaultValue: 20,
    })
    first?: number,
    @Args('after', {
      type: () => String,
      nullable: true,
      description: 'Cursor for pagination',
    })
    after?: string,
  ): Promise<EnumValueConnection> {
    const serviceResult = await this.enumValuesService.findAll(first, after);
    return mapPrismaEnumValueConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ traitId: 'traitId' })
  @Query(() => EnumValueConnection, {
    name: 'enumValuesByTrait',
    description: 'Get enum values by trait ID with pagination',
  })
  async findByTrait(
    @Args('traitId', { type: () => ID, description: 'Trait ID' })
    traitId: string,
    @Args('first', {
      type: () => Int,
      nullable: true,
      description: 'Number of enum values to return',
      defaultValue: 20,
    })
    first?: number,
    @Args('after', {
      type: () => String,
      nullable: true,
      description: 'Cursor for pagination',
    })
    after?: string,
  ): Promise<EnumValueConnection> {
    const serviceResult = await this.enumValuesService.findByTrait(
      traitId,
      first,
      after,
    );
    return mapPrismaEnumValueConnectionToGraphQL(serviceResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.Any)
  @ResolveCommunityFrom({ enumValueId: 'id' })
  @Query(() => EnumValue, {
    name: 'enumValueById',
    description: 'Get an enum value by ID',
  })
  async findOne(
    @Args('id', { type: () => ID, description: 'Enum value ID' })
    id: string,
  ): Promise<EnumValue> {
    const prismaResult = await this.enumValuesService.findOne(id);
    return mapPrismaEnumValueToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ enumValueId: 'id' })
  @Mutation(() => EnumValue, { description: 'Update an enum value' })
  async updateEnumValue(
    @Args('id', { type: () => ID, description: 'Enum value ID' })
    id: string,
    @Args('updateEnumValueInput', { description: 'Enum value update data' })
    updateEnumValueInput: UpdateEnumValueInput,
  ): Promise<EnumValue> {
    const serviceInput = mapUpdateEnumValueInputToService(updateEnumValueInput);
    const prismaResult = await this.enumValuesService.update(id, serviceInput);
    return mapPrismaEnumValueToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ enumValueId: 'id' })
  @Mutation(() => RemovalResponse, { description: 'Remove an enum value' })
  async removeEnumValue(
    @Args('id', { type: () => ID, description: 'Enum value ID' })
    id: string,
  ): Promise<RemovalResponse> {
    await this.enumValuesService.remove(id);
    return { removed: true, message: 'Enum value successfully removed' };
  }

  // Field resolver for trait relation
  @ResolveField('trait', () => Trait, {
    description: 'The trait this enum value belongs to',
  })
  async resolveTrait(@Parent() enumValue: EnumValue): Promise<Trait> {
    const prismaTrait = await this.traitsService.findOne(enumValue.traitId);
    return mapPrismaTraitToGraphQL(prismaTrait);
  }
}
