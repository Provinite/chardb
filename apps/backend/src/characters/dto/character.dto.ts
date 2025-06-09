import { Field, InputType, ObjectType, Int, Float, ID, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID, IsEnum, MinLength, MaxLength, Min, Max } from 'class-validator';
import { Visibility } from '@prisma/client';

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

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  species?: string;

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
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  personality?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  backstory?: string;

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
}

@InputType()
export class UpdateCharacterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  species?: string;

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
  @MaxLength(5000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  personality?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  backstory?: string;

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

// Output types
@ObjectType()
export class CharacterCount {
  @Field(() => Int)
  images: number;

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