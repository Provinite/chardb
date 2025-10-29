import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, Length, IsOptional, IsEnum, IsUUID, IsBoolean } from 'class-validator';
import { TraitValueType } from '../../shared/enums/trait-value-type.enum';

@InputType()
export class CreateTraitInput {
  /** Name of the trait (unique within species) */
  @Field({ description: 'Name of the trait' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /** Type of values this trait can store */
  @Field(() => TraitValueType, { description: 'Type of values this trait can store' })
  @IsEnum(TraitValueType)
  valueType: TraitValueType;

  /** Whether this trait allows multiple values per character */
  @Field(() => Boolean, {
    nullable: true,
    defaultValue: false,
    description: 'Whether this trait allows multiple values per character'
  })
  @IsBoolean()
  @IsOptional()
  allowsMultipleValues?: boolean;

  /** ID of the species this trait belongs to */
  @Field(() => ID, { description: 'ID of the species this trait belongs to' })
  @IsUUID()
  @IsNotEmpty()
  speciesId: string;

  /** ID of the color for this trait */
  @Field(() => ID, { nullable: true, description: 'ID of the color for this trait' })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}

@InputType()
export class UpdateTraitInput {
  /** Name of the trait (unique within species) */
  @Field({ nullable: true, description: 'Name of the trait' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  /** Type of values this trait can store */
  @Field(() => TraitValueType, { nullable: true, description: 'Type of values this trait can store' })
  @IsOptional()
  @IsEnum(TraitValueType)
  valueType?: TraitValueType;

  /** Whether this trait allows multiple values per character */
  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether this trait allows multiple values per character'
  })
  @IsBoolean()
  @IsOptional()
  allowsMultipleValues?: boolean;

  /** ID of the species this trait belongs to */
  @Field(() => ID, { nullable: true, description: 'ID of the species this trait belongs to' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesId?: string;

  /** ID of the color for this trait */
  @Field(() => ID, { nullable: true, description: 'ID of the color for this trait' })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}