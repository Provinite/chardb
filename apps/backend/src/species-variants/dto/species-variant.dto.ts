import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, Length, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateSpeciesVariantInput {
  /** Name of the species variant (unique within species) */
  @Field({ description: 'Name of the species variant' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  /** ID of the species this variant belongs to */
  @Field(() => ID, { description: 'ID of the species this variant belongs to' })
  @IsUUID()
  @IsNotEmpty()
  speciesId: string;

  /** ID of the color for this species variant */
  @Field(() => ID, { nullable: true, description: 'ID of the color for this species variant' })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}

@InputType()
export class UpdateSpeciesVariantInput {
  /** Name of the species variant (unique within species) */
  @Field({ nullable: true, description: 'Name of the species variant' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name?: string;

  /** ID of the species this variant belongs to */
  @Field(() => ID, { nullable: true, description: 'ID of the species this variant belongs to' })
  @IsOptional()
  @IsUUID()
  @IsNotEmpty()
  speciesId?: string;

  /** ID of the color for this species variant */
  @Field(() => ID, { nullable: true, description: 'ID of the color for this species variant' })
  @IsOptional()
  @IsUUID()
  colorId?: string;
}