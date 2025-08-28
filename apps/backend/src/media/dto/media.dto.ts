import { InputType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { TextFormatting, Visibility } from '@chardb/database';
import { IsString, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';

/**
 * Enum for filtering media by type
 * Note: This is not stored in the DB, used only for filtering
 */
export enum MediaType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT'
}

registerEnumType(MediaType, {
  name: 'MediaType',
  description: 'The type of media content for filtering',
});

/**
 * Input type for filtering and paginating media queries
 */
@InputType({ description: 'Input type for filtering and paginating media queries' })
export class MediaFiltersInput {
  /** Search term to filter by title and description */
  @Field({ nullable: true, description: 'Search term to filter by title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by media type (image or text) */
  @Field(() => MediaType, { nullable: true, description: 'Filter by media type (image or text)' })
  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  /** Filter by visibility level */
  @Field(() => Visibility, { nullable: true, description: 'Filter by visibility level' })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  /** Filter by owner user ID */
  @Field(() => ID, { nullable: true, description: 'Filter by owner user ID' })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  /** Filter by associated character ID */
  @Field(() => ID, { nullable: true, description: 'Filter by associated character ID' })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  /** Filter by gallery ID */
  @Field(() => ID, { nullable: true, description: 'Filter by gallery ID' })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  /** Maximum number of results to return */
  @Field({ nullable: true, description: 'Maximum number of results to return' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  /** Number of results to skip for pagination */
  @Field({ nullable: true, description: 'Number of results to skip for pagination' })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Input type for creating new text media
 */
@InputType({ description: 'Input type for creating new text media' })
export class CreateTextMediaInput {
  /** Title for the text media */
  @Field({ description: 'Title for the text media' })
  @IsString()
  title: string;

  /** Optional description for the text media */
  @Field({ nullable: true, description: 'Optional description for the text media' })
  @IsOptional()
  @IsString()
  description?: string;

  /** The actual text content */
  @Field({ description: 'The actual text content' })
  @IsString()
  content: string;

  /** Text formatting type (plaintext or markdown) */
  @Field(() => TextFormatting, { defaultValue: TextFormatting.PLAINTEXT, description: 'Text formatting type (plaintext or markdown)' })
  @IsEnum(TextFormatting)
  formatting: TextFormatting;

  /** Optional character to associate with this media */
  @Field(() => ID, { nullable: true, description: 'Optional character to associate with this media' })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  /** Optional gallery to add this media to */
  @Field(() => ID, { nullable: true, description: 'Optional gallery to add this media to' })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  /** Visibility setting for the media */
  @Field(() => Visibility, { defaultValue: Visibility.PUBLIC, description: 'Visibility setting for the media' })
  @IsEnum(Visibility)
  visibility: Visibility;

  /** Optional tags to associate with this media */
  @Field(() => [String], { nullable: true, description: 'Optional tags to associate with this media' })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Input type for updating media metadata
 */
@InputType({ description: 'Input type for updating media metadata' })
export class UpdateMediaInput {
  /** Updated title for the media */
  @Field({ nullable: true, description: 'Updated title for the media' })
  @IsOptional()
  @IsString()
  title?: string;

  /** Updated description for the media */
  @Field({ nullable: true, description: 'Updated description for the media' })
  @IsOptional()
  @IsString()
  description?: string;

  /** Updated character association */
  @Field(() => ID, { nullable: true, description: 'Updated character association' })
  @IsOptional()
  @IsUUID()
  characterId?: string;

  /** Updated gallery association */
  @Field(() => ID, { nullable: true, description: 'Updated gallery association' })
  @IsOptional()
  @IsUUID()
  galleryId?: string;

  /** Updated visibility setting */
  @Field(() => Visibility, { nullable: true, description: 'Updated visibility setting' })
  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility;

  /** Updated tags */
  @Field(() => [String], { nullable: true, description: 'Updated tags' })
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Input type for updating text content specifically
 */
@InputType({ description: 'Input type for updating text content specifically' })
export class UpdateTextContentInput {
  /** Updated text content */
  @Field({ nullable: true, description: 'Updated text content' })
  @IsOptional()
  @IsString()
  content?: string;

  /** Updated text formatting type */
  @Field(() => TextFormatting, { nullable: true, description: 'Updated text formatting type' })
  @IsOptional()
  @IsEnum(TextFormatting)
  formatting?: TextFormatting;
}

/**
 * Input type for managing media tags
 */
@InputType({ description: 'Input type for managing media tags' })
export class ManageMediaTagsInput {
  /** Array of tag names to add or remove */
  @Field(() => [String], { description: 'Array of tag names to add or remove' })
  @IsString({ each: true })
  tagNames: string[];
}

/**
 * Input type for setting a character's main media
 */
@InputType({ description: 'Input type for setting a character\'s main media' })
export class SetCharacterMainMediaInput {
  /** Media ID to set as main, or null to remove main media */
  @Field(() => ID, { nullable: true, description: 'Media ID to set as main, or null to remove main media' })
  @IsOptional()
  @IsUUID()
  mediaId?: string;
}