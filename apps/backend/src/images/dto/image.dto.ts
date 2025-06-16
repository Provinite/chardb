import { Field, InputType, ObjectType, Int, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsUUID, IsEnum, MaxLength, Min, Max } from 'class-validator';
import { Visibility } from '@chardb/database';

// File upload handled via REST endpoint - this is for GraphQL updates
@InputType()
export class CreateImageFromUploadInput {
  @Field()
  @IsString()
  uploadId: string; // Reference to uploaded file

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @Field({ defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  // Artist attribution
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  artistUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;
}

@InputType()
export class UpdateImageInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  altText?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  // Artist attribution
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  artistName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  artistUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;
}

@InputType()
export class ImageFiltersInput {
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

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  uploaderId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isNsfw?: boolean;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  artistId?: string;
}

@InputType()
export class ManageImageTagsInput {
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  tagNames: string[];
}

// Export for service use
export interface ImageFilters {
  limit?: number;
  offset?: number;
  uploaderId?: string;
  characterId?: string;
  galleryId?: string;
  isNsfw?: boolean;
  visibility?: Visibility;
}