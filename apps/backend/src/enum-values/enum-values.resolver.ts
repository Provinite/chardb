import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { EnumValuesService } from './enum-values.service';
import { EnumValue, EnumValueConnection } from './entities/enum-value.entity';
import { CreateEnumValueInput, UpdateEnumValueInput } from './dto/enum-value.dto';

@Resolver(() => EnumValue)
export class EnumValuesResolver {
  constructor(private readonly enumValuesService: EnumValuesService) {}

  /** Create a new enum value */
  @Mutation(() => EnumValue, { description: 'Create a new enum value' })
  createEnumValue(
    @Args('createEnumValueInput', { description: 'Enum value creation data' }) 
    createEnumValueInput: CreateEnumValueInput,
  ): Promise<EnumValue> {
    return this.enumValuesService.create(createEnumValueInput);
  }

  /** Get all enum values with pagination */
  @Query(() => EnumValueConnection, { name: 'enumValues', description: 'Get all enum values with pagination' })
  findAll(
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum values to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueConnection> {
    return this.enumValuesService.findAll(first, after);
  }

  /** Get enum values by trait ID with pagination */
  @Query(() => EnumValueConnection, { name: 'enumValuesByTrait', description: 'Get enum values by trait ID with pagination' })
  findByTrait(
    @Args('traitId', { type: () => ID, description: 'Trait ID' })
    traitId: string,
    @Args('first', { type: () => Int, nullable: true, description: 'Number of enum values to return', defaultValue: 20 })
    first?: number,
    @Args('after', { type: () => String, nullable: true, description: 'Cursor for pagination' })
    after?: string,
  ): Promise<EnumValueConnection> {
    return this.enumValuesService.findByTrait(traitId, first, after);
  }

  /** Get an enum value by ID */
  @Query(() => EnumValue, { name: 'enumValueById', description: 'Get an enum value by ID' })
  findOne(
    @Args('id', { type: () => ID, description: 'Enum value ID' }) 
    id: string,
  ): Promise<EnumValue> {
    return this.enumValuesService.findOne(id);
  }

  /** Update an enum value */
  @Mutation(() => EnumValue, { description: 'Update an enum value' })
  updateEnumValue(
    @Args('id', { type: () => ID, description: 'Enum value ID' }) 
    id: string,
    @Args('updateEnumValueInput', { description: 'Enum value update data' }) 
    updateEnumValueInput: UpdateEnumValueInput,
  ): Promise<EnumValue> {
    return this.enumValuesService.update(id, updateEnumValueInput);
  }

  /** Remove an enum value */
  @Mutation(() => EnumValue, { description: 'Remove an enum value' })
  removeEnumValue(
    @Args('id', { type: () => ID, description: 'Enum value ID' }) 
    id: string,
  ): Promise<EnumValue> {
    return this.enumValuesService.remove(id);
  }
}