import { ObjectType, Field, ID } from '@nestjs/graphql';
import { EnumValue } from '../../enum-values/entities/enum-value.entity';
import { SpeciesVariant } from '../../species-variants/entities/species-variant.entity';

@ObjectType()
export class EnumValueSetting {
  /** Unique identifier for the enum value setting */
  @Field(() => ID, { description: 'Unique identifier for the enum value setting' })
  id: string;

  /** ID of the enum value this setting allows */
  @Field(() => ID, { description: 'ID of the enum value this setting allows' })
  enumValueId: string;

  /** ID of the species variant this setting belongs to */
  @Field(() => ID, { description: 'ID of the species variant this setting belongs to' })
  speciesVariantId: string;

  /** When the enum value setting was created */
  @Field({ description: 'When the enum value setting was created' })
  createdAt: Date;

  /** When the enum value setting was last updated */
  @Field({ description: 'When the enum value setting was last updated' })
  updatedAt: Date;

  /** The enum value this setting allows */
  @Field(() => EnumValue, { description: 'The enum value this setting allows' })
  enumValue: EnumValue;

  /** The species variant this setting belongs to */
  @Field(() => SpeciesVariant, { description: 'The species variant this setting belongs to' })
  speciesVariant: SpeciesVariant;
}

@ObjectType()
export class EnumValueSettingConnection {
  /** List of enum value settings in this connection */
  @Field(() => [EnumValueSetting], { description: 'List of enum value settings in this connection' })
  nodes: EnumValueSetting[];

  /** Total number of enum value settings available */
  @Field({ description: 'Total number of enum value settings available' })
  totalCount: number;

  /** Whether there are more enum value settings after this page */
  @Field({ description: 'Whether there are more enum value settings after this page' })
  hasNextPage: boolean;

  /** Whether there are more enum value settings before this page */
  @Field({ description: 'Whether there are more enum value settings before this page' })
  hasPreviousPage: boolean;
}