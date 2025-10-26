import { InputType, Field, ID, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min, IsBoolean, IsEnum, IsDate, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';

@InputType()
export class CreateTraitListEntryInput {
  /** ID of the trait this entry configures */
  @Field(() => ID, { description: 'ID of the trait this entry configures' })
  @IsUUID()
  @IsNotEmpty()
  traitId: string;

  /** ID of the species variant this entry belongs to */
  @Field(() => ID, { description: 'ID of the species variant this entry belongs to' })
  @IsUUID()
  @IsNotEmpty()
  speciesVariantId: string;

  /** Display order of this trait in the variant's trait list */
  @Field(() => Int, { description: 'Display order of this trait in the variant\'s trait list' })
  @IsInt()
  @Min(0)
  order: number;

  /** Whether this trait is required for critters using this variant */
  @Field({ description: 'Whether this trait is required for critters using this variant' })
  @IsBoolean()
  required: boolean;

  /** Type of values this trait stores */
  @Field(() => TraitValueType, { description: 'Type of values this trait stores' })
  @IsEnum(TraitValueType)
  valueType: TraitValueType;

  /** Default string value for this trait */
  @Field({ nullable: true, description: 'Default string value for this trait' })
  @IsOptional()
  @IsString()
  defaultValueString?: string;

  /** Default integer value for this trait */
  @Field(() => Int, { nullable: true, description: 'Default integer value for this trait' })
  @IsOptional()
  @IsInt()
  defaultValueInt?: number;

  /** Default timestamp value for this trait */
  @Field({ nullable: true, description: 'Default timestamp value for this trait' })
  @IsOptional()
  @IsDate()
  defaultValueTimestamp?: Date;
}

@InputType()
export class UpdateTraitListEntryInput {
  /** ID of the trait this entry configures */
  @Field(() => ID, { nullable: true, description: 'ID of the trait this entry configures' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  traitId?: string;

  /** ID of the species variant this entry belongs to */
  @Field(() => ID, { nullable: true, description: 'ID of the species variant this entry belongs to' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesVariantId?: string;

  /** Display order of this trait in the variant's trait list */
  @Field(() => Int, { nullable: true, description: 'Display order of this trait in the variant\'s trait list' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** Whether this trait is required for critters using this variant */
  @Field({ nullable: true, description: 'Whether this trait is required for critters using this variant' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  /** Type of values this trait stores */
  @Field(() => TraitValueType, { nullable: true, description: 'Type of values this trait stores' })
  @IsOptional()
  @IsEnum(TraitValueType)
  valueType?: TraitValueType;

  /** Default string value for this trait */
  @Field({ nullable: true, description: 'Default string value for this trait' })
  @IsOptional()
  @IsString()
  defaultValueString?: string;

  /** Default integer value for this trait */
  @Field(() => Int, { nullable: true, description: 'Default integer value for this trait' })
  @IsOptional()
  @IsInt()
  defaultValueInt?: number;

  /** Default timestamp value for this trait */
  @Field({ nullable: true, description: 'Default timestamp value for this trait' })
  @IsOptional()
  @IsDate()
  defaultValueTimestamp?: Date;
}

@InputType()
export class TraitOrderInput {
  /** ID of the trait */
  @Field(() => ID, { description: 'ID of the trait' })
  @IsUUID()
  @IsNotEmpty()
  traitId: string;

  /** New display order for this trait */
  @Field(() => Int, { description: 'New display order for this trait' })
  @IsInt()
  @Min(0)
  order: number;
}

@InputType()
export class UpdateTraitOrdersInput {
  /** ID of the species variant */
  @Field(() => ID, { description: 'ID of the species variant' })
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  /** Array of trait order updates */
  @Field(() => [TraitOrderInput], { description: 'Array of trait order updates' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TraitOrderInput)
  traitOrders: TraitOrderInput[];
}
