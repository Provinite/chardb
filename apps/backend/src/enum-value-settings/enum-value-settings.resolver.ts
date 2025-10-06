import { Resolver, Query, Mutation, Args, ID, Int, ResolveField, Parent } from '@nestjs/graphql';
import { EnumValueSettingsService } from './enum-value-settings.service';
import { RequireAuthenticated } from '../auth/decorators/RequireAuthenticated';
import { RequireGlobalAdmin } from '../auth/decorators/RequireGlobalAdmin';
import { RequireCommunityPermission } from '../auth/decorators/RequireCommunityPermission';
import { ResolveCommunityFrom } from '../auth/decorators/ResolveCommunityFrom';
import { CommunityPermission } from '../auth/CommunityPermission';
import { EnumValueSetting, EnumValueSettingConnection } from './entities/enum-value-setting.entity';
import { CreateEnumValueSettingInput, UpdateEnumValueSettingInput } from './dto/enum-value-setting.dto';
import {
  mapCreateEnumValueSettingInputToService,
  mapUpdateEnumValueSettingInputToService,
  mapPrismaEnumValueSettingToGraphQL,
  mapPrismaEnumValueSettingConnectionToGraphQL,
} from './utils/enum-value-setting-resolver-mappers';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import { EnumValue } from '../enum-values/entities/enum-value.entity';
import { SpeciesVariant } from '../species-variants/entities/species-variant.entity';
import { EnumValuesService } from '../enum-values/enum-values.service';
import { mapPrismaEnumValueToGraphQL } from '../enum-values/utils/enum-value-resolver-mappers';
import { SpeciesVariantsService } from '../species-variants/species-variants.service';
import { mapPrismaSpeciesVariantToGraphQL } from '../species-variants/utils/species-variant-resolver-mappers';

@Resolver(() => EnumValueSetting)
export class EnumValueSettingsResolver {
  constructor(
    private readonly enumValueSettingsService: EnumValueSettingsService,
    private readonly enumValuesService: EnumValuesService,
    private readonly speciesVariantsService: SpeciesVariantsService,
  ) {}

  /** Create a new enum value setting */
  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ speciesVariantId: 'createEnumValueSettingInput.speciesVariantId' })
  @Mutation(() => EnumValueSetting, { description: 'Create a new enum value setting' })
  async createEnumValueSetting(
    @Args('createEnumValueSettingInput', { description: 'Enum value setting creation data' })
    createEnumValueSettingInput: CreateEnumValueSettingInput,
  ): Promise<EnumValueSetting> {
    const serviceInput = mapCreateEnumValueSettingInputToService(createEnumValueSettingInput);
    const prismaResult = await this.enumValueSettingsService.create(serviceInput);
    return mapPrismaEnumValueSettingToGraphQL(prismaResult);
  }

  /** Get all enum value settings with pagination */
  @RequireAuthenticated()
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettings', description: 'Get all enum value settings with pagination' })
  async findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    const serviceResult = await this.enumValueSettingsService.findAll(first, after);
    return mapPrismaEnumValueSettingConnectionToGraphQL(serviceResult);
  }

  /** Get enum value settings by species variant ID with pagination */
  @RequireAuthenticated()
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettingsBySpeciesVariant', description: 'Get enum value settings by species variant ID with pagination' })
  async findBySpeciesVariant(
    @Args('speciesVariantId', { type: () => ID, description: 'Species variant ID' })
    speciesVariantId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    const serviceResult = await this.enumValueSettingsService.findBySpeciesVariant(speciesVariantId, first, after);
    return mapPrismaEnumValueSettingConnectionToGraphQL(serviceResult);
  }

  /** Get enum value settings by enum value ID with pagination */
  @RequireAuthenticated()
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettingsByEnumValue', description: 'Get enum value settings by enum value ID with pagination' })
  async findByEnumValue(
    @Args('enumValueId', { type: () => ID, description: 'Enum value ID' })
    enumValueId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    const serviceResult = await this.enumValueSettingsService.findByEnumValue(enumValueId, first, after);
    return mapPrismaEnumValueSettingConnectionToGraphQL(serviceResult);
  }

  /** Get an enum value setting by ID */
  @RequireAuthenticated()
  @Query(() => EnumValueSetting, { name: 'enumValueSettingById', description: 'Get an enum value setting by ID' })
  async findOne(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' })
    id: string,
  ): Promise<EnumValueSetting> {
    const prismaResult = await this.enumValueSettingsService.findOne(id);
    return mapPrismaEnumValueSettingToGraphQL(prismaResult);
  }

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ enumValueSettingId: 'id' })
  @Mutation(() => EnumValueSetting, { description: 'Update an enum value setting' })
  async updateEnumValueSetting(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' })
    id: string,
    @Args('updateEnumValueSettingInput', { description: 'Enum value setting update data' })
    updateEnumValueSettingInput: UpdateEnumValueSettingInput,
  ): Promise<EnumValueSetting> {
    const serviceInput = mapUpdateEnumValueSettingInputToService(updateEnumValueSettingInput);
    const prismaResult = await this.enumValueSettingsService.update(id, serviceInput);
    return mapPrismaEnumValueSettingToGraphQL(prismaResult);
  }

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanEditSpecies)
  @ResolveCommunityFrom({ enumValueSettingId: 'id' })
  @Mutation(() => RemovalResponse, { description: 'Remove an enum value setting' })
  async removeEnumValueSetting(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' })
    id: string,
  ): Promise<RemovalResponse> {
    await this.enumValueSettingsService.remove(id);
    return { removed: true, message: 'Enum value setting successfully removed' };
  }

  // Field resolvers for relations
  @ResolveField('enumValue', () => EnumValue, { description: 'The enum value this setting allows' })
  async resolveEnumValue(@Parent() enumValueSetting: EnumValueSetting): Promise<EnumValue> {
    const prismaEnumValue = await this.enumValuesService.findOne(enumValueSetting.enumValueId);
    return mapPrismaEnumValueToGraphQL(prismaEnumValue);
  }

  @ResolveField('speciesVariant', () => SpeciesVariant, { description: 'The species variant this setting belongs to' })
  async resolveSpeciesVariant(@Parent() enumValueSetting: EnumValueSetting): Promise<SpeciesVariant> {
    const prismaSpeciesVariant = await this.speciesVariantsService.findOne(enumValueSetting.speciesVariantId);
    return mapPrismaSpeciesVariantToGraphQL(prismaSpeciesVariant);
  }
}