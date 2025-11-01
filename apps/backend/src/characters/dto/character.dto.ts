import { Field, InputType, ObjectType, Int, Float, ID, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID, IsEnum, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Visibility } from '@chardb/database';
import { CharacterTraitValueInput } from './character-trait.dto';
import { PendingOwnerInput } from '../../pending-ownership/dto/pending-ownership.dto';

// Register enum for GraphQL
registerEnumType(Visibility, {
  name: 'Visibility',
  description: 'Visibility levels for content',
});

@InputType()
export class CreateCharacterInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesVariantId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  age?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  details?: string;

  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @Field(() => [String], { defaultValue: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  customFields?: any; // JSON field

  @Field(() => [CharacterTraitValueInput], { defaultValue: [], description: 'Trait values for the character' })
  @IsOptional()
  traitValues?: CharacterTraitValueInput[];

  @Field(() => PendingOwnerInput, { nullable: true, description: 'Create character with pending ownership for an external account' })
  @IsOptional()
  pendingOwner?: PendingOwnerInput;

  @Field({ defaultValue: false, description: 'Create character without an owner (orphaned/community character)' })
  @IsOptional()
  @IsBoolean()
  isOrphaned?: boolean;
}

@InputType()
export class UpdateCharacterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesVariantId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  age?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  gender?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(15000)
  details?: string;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  customFields?: any; // JSON field

  @Field(() => [CharacterTraitValueInput], { nullable: true, description: 'Trait values for the character' })
  @IsOptional()
  traitValues?: CharacterTraitValueInput[];

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  mainMediaId?: string;
}

@InputType()
export class CharacterFiltersInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  species?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  speciesVariantId?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isSellable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isTradeable?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  gender?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ageRange?: string; // "young", "adult", "elder", etc.

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sortBy?: string; // "name", "created", "updated", "price"

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  sortOrder?: string; // "asc", "desc"

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  searchFields?: string; // "name", "description", "all" - what fields to search
}

@InputType()
export class TransferCharacterInput {
  @Field(() => ID)
  @IsUUID()
  newOwnerId: string;
}

@InputType()
export class ManageTagsInput {
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  tagNames: string[];
}


/**
 * Input type for setting a character's main media
 */
@InputType()
export class SetMainMediaInput {
  /** Media ID to set as main, or null to remove main media */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}

// Output types
@ObjectType()
export class CharacterCount {
  @Field(() => Int)
  media: number;

  @Field(() => Int)
  comments: number;

  @Field(() => Int)
  likes: number;
}

// This will be imported in the resolver

// Export for service use
export interface CharacterFilters {
  limit?: number;
  offset?: number;
  search?: string;
  species?: string;
  speciesId?: string;
  speciesVariantId?: string;
  tags?: string[];
  ownerId?: string;
  visibility?: Visibility;
  isSellable?: boolean;
  isTradeable?: boolean;
  gender?: string;
  ageRange?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  searchFields?: string;
}

// Character entity will be imported from entities/character.entity.ts