import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { EnumValueSettingsService } from './enum-value-settings.service';
import { EnumValueSetting, EnumValueSettingConnection } from './entities/enum-value-setting.entity';
import { CreateEnumValueSettingInput, UpdateEnumValueSettingInput } from './dto/enum-value-setting.dto';

@Resolver(() => EnumValueSetting)
export class EnumValueSettingsResolver {
  constructor(private readonly enumValueSettingsService: EnumValueSettingsService) {}

  /** Create a new enum value setting */
  @Mutation(() => EnumValueSetting, { description: 'Create a new enum value setting' })
  createEnumValueSetting(
    @Args('createEnumValueSettingInput', { description: 'Enum value setting creation data' }) 
    createEnumValueSettingInput: CreateEnumValueSettingInput,
  ): Promise<EnumValueSetting> {
    return this.enumValueSettingsService.create(createEnumValueSettingInput);
  }

  /** Get all enum value settings with pagination */
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettings', description: 'Get all enum value settings with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    return this.enumValueSettingsService.findAll(first, after);
  }

  /** Get enum value settings by species variant ID with pagination */
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettingsBySpeciesVariant', description: 'Get enum value settings by species variant ID with pagination' })
  findBySpeciesVariant(
    @Args('speciesVariantId', { type: () => ID, description: 'Species variant ID' })
    speciesVariantId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    return this.enumValueSettingsService.findBySpeciesVariant(speciesVariantId, first, after);
  }

  /** Get enum value settings by enum value ID with pagination */
  @Query(() => EnumValueSettingConnection, { name: 'enumValueSettingsByEnumValue', description: 'Get enum value settings by enum value ID with pagination' })
  findByEnumValue(
    @Args('enumValueId', { type: () => ID, description: 'Enum value ID' })
    enumValueId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum value settings to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueSettingConnection> {
    return this.enumValueSettingsService.findByEnumValue(enumValueId, first, after);
  }

  /** Get an enum value setting by ID */
  @Query(() => EnumValueSetting, { name: 'enumValueSettingById', description: 'Get an enum value setting by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' }) 
    id: string,
  ): Promise<EnumValueSetting> {
    return this.enumValueSettingsService.findOne(id);
  }

  /** Update an enum value setting */
  @Mutation(() => EnumValueSetting, { description: 'Update an enum value setting' })
  updateEnumValueSetting(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' }) 
    id: string,
    @Args('updateEnumValueSettingInput', { description: 'Enum value setting update data' }) 
    updateEnumValueSettingInput: UpdateEnumValueSettingInput,
  ): Promise<EnumValueSetting> {
    return this.enumValueSettingsService.update(id, updateEnumValueSettingInput);
  }

  /** Remove an enum value setting */
  @Mutation(() => EnumValueSetting, { description: 'Remove an enum value setting' })
  removeEnumValueSetting(
    @Args('id', { type: () => ID, description: 'Enum value setting ID' }) 
    id: string,
  ): Promise<EnumValueSetting> {
    return this.enumValueSettingsService.remove(id);
  }
}