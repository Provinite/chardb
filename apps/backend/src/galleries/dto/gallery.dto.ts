import { Field, InputType, ObjectType, Int, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsNumber, IsUUID, IsEnum, MaxLength, Min, Max, IsArray } from 'class-validator';
import { Visibility } from '@chardb/database';

@InputType()
export class CreateGalleryInput {
  @Field()
  @IsString()
  @MaxLength(100)
  name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

@InputType()
export class UpdateGalleryInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}

@InputType()
export class GalleryFiltersInput {
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
  ownerId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;
}

@InputType()
export class GalleryImageOperationInput {
  @Field(() => ID)
  @IsUUID()
  imageId: string;
}

@InputType()
export class ReorderGalleriesInput {
  @Field(() => [ID])
  @IsArray()
  @IsUUID('all', { each: true })
  galleryIds: string[];
}

// Export for service use
export interface GalleryFilters {
  limit?: number;
  offset?: number;
  ownerId?: string;
  characterId?: string;
  visibility?: Visibility;
}