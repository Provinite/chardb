import { InputType, Field, ID } from '@nestjs/graphql';
import { MediaType, TextFormatting, Visibility } from '@chardb/database';
import { IsString, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';

@InputType()
export class MediaFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => MediaType, { nullable: true })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

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
  @IsInt()
  @Min(1)
  limit?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

@InputType()
export class CreateTextMediaInput {
  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsString()
  content: string;

  @Field(() => TextFormatting, { defaultValue: TextFormatting.PLAINTEXT })
  @IsEnum(TextFormatting)
  formatting: TextFormatting;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC })
  @IsEnum(Visibility)
  visibility: Visibility;
}

@InputType()
export class UpdateMediaInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  @Field(() => Visibility, { nullable: true })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;
}

@InputType()
export class UpdateTextContentInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field(() => TextFormatting, { nullable: true })
  @IsOptional()
  @IsEnum(TextFormatting)
  formatting?: TextFormatting;
}

@InputType()
export class ManageMediaTagsInput {
  @Field(() => [String])
  @IsString({ each: true })
  tagNames: string[];
}

@InputType()
export class SetCharacterMainMediaInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}