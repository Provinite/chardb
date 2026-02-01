import { Field, InputType, ObjectType, Int, Float, ID, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID, IsEnum, MinLength, MaxLength, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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

  @Field({ nullable: true, description: 'Official registry identifier for this character within its species' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registryId?: string;

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
  @ValidateNested()
  @Type(() => PendingOwnerInput)
  pendingOwner?: PendingOwnerInput;

  @Field({ defaultValue: true, description: 'Whether to assign ownership to the creator. Set to false to create an orphaned character.' })
  @IsOptional()
  @IsBoolean()
  assignToSelf?: boolean;
}

/**
 * Wrapper type to distinguish "set owner to value/null" from "don't change owner"
 * Absent field = no change, present with value = change to that value
 */
@InputType()
export class OwnerIdUpdate {
  @Field(() => ID, { nullable: true, description: 'Set owner ID (null = orphan character)' })
  @IsOptional()
  @IsUUID()
  set?: string | null;
}

/**
 * Wrapper type to distinguish "set pending owner" from "don't change pending owner"
 * Absent field = no change, present with value = change to that value
 */
@InputType()
export class PendingOwnerUpdate {
  @Field(() => PendingOwnerInput, { nullable: true, description: 'Set pending owner (null = clear pending owner)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PendingOwnerInput)
  set?: PendingOwnerInput | null;
}

/**
 * Input for updating character profile fields (name, bio, visibility, trade settings, etc.)
 * Requires canEditOwnCharacter (for owned) or canEditCharacter (for any) permission.
 */
@InputType({ description: 'Input for updating character profile fields' })
export class UpdateCharacterProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

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
  customFields?: string; // JSON field

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  mainMediaId?: string;

  @Field(() => OwnerIdUpdate, { nullable: true, description: 'Update character ownership (requires canCreateOrphanedCharacter permission)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerIdUpdate)
  ownerIdUpdate?: OwnerIdUpdate;

  @Field(() => PendingOwnerUpdate, { nullable: true, description: 'Update pending ownership (requires canCreateOrphanedCharacter permission)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PendingOwnerUpdate)
  pendingOwnerUpdate?: PendingOwnerUpdate;
}

/**
 * Input for updating character registry fields (registryId, variant, traits).
 * Requires canEditOwnCharacterRegistry (for owned) or canEditCharacterRegistry (for any) permission.
 */
@InputType({ description: 'Input for updating character registry fields' })
export class UpdateCharacterRegistryInput {
  @Field({ nullable: true, description: 'Official registry identifier for this character within its species' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registryId?: string;

  @Field(() => ID, { nullable: true, description: 'Species variant ID' })
  @IsOptional()
  @IsUUID()
  speciesVariantId?: string;

  @Field(() => [CharacterTraitValueInput], { nullable: true, description: 'Trait values for the character' })
  @IsOptional()
  traitValues?: CharacterTraitValueInput[];
}

/**
 * Input for first-time species assignment to a character.
 * This is only valid for characters that don't already have a species assigned.
 */
@InputType()
export class AssignCharacterSpeciesInput {
  @Field(() => ID, { description: 'Species ID to assign to the character' })
  @IsUUID()
  speciesId: string;

  @Field(() => ID, { nullable: true, description: 'Species variant ID' })
  @IsOptional()
  @IsUUID()
  speciesVariantId?: string;

  @Field({ nullable: true, description: 'Official registry identifier for this character within its species' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registryId?: string;

  @Field(() => [CharacterTraitValueInput], { nullable: true, description: 'Initial trait values for the character' })
  @IsOptional()
  traitValues?: CharacterTraitValueInput[];
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

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  communityId?: string;

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
  communityId?: string;
  tags?: string[];
  ownerId?: string;
  visibility?: Visibility;
  isSellable?: boolean;
  isTradeable?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  searchFields?: string;
}

// Character entity will be imported from entities/character.entity.ts