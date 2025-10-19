import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
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
  @Field(() => TraitValueType, {
    description: 'Type of values this trait can store',
  })
  @IsEnum(TraitValueType)
  valueType: TraitValueType;

  /** ID of the species this trait belongs to */
  @Field(() => ID, { description: 'ID of the species this trait belongs to' })
  @IsUUID()
  @IsNotEmpty()
  speciesId: string;
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
  @Field(() => TraitValueType, {
    nullable: true,
    description: 'Type of values this trait can store',
  })
  @IsOptional()
  @IsEnum(TraitValueType)
  valueType?: TraitValueType;

  /** ID of the species this trait belongs to */
  @Field(() => ID, {
    nullable: true,
    description: 'ID of the species this trait belongs to',
  })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesId?: string;
}
