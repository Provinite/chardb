import { ObjectType, Field, ID, createUnionType, registerEnumType } from '@nestjs/graphql';
import { TextFormatting, Visibility } from '@chardb/database';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Gallery } from '../../galleries/entities/gallery.entity';
import { Tag } from '../../shared/entities/tag.entity';
import { Image } from '../../images/entities/image.entity';

// Register enums for GraphQL
registerEnumType(TextFormatting, {
  name: 'TextFormatting',
  description: 'The formatting type for text content',
});

/**
 * Text content entity for storing text-based media content
 */
@ObjectType({ description: 'Text content with formatting and word count information' })
export class TextContent {
  /** Unique identifier for the text content */
  @Field(() => ID, { description: 'Unique identifier for the text content' })
  id: string;

  /** The actual text content */
  @Field({ description: 'The actual text content' })
  content: string;

  /** Automatically calculated word count */
  @Field({ description: 'Automatically calculated word count' })
  wordCount: number;

  /** Formatting type (plaintext or markdown) */
  @Field(() => TextFormatting, { description: 'Text formatting type (plaintext or markdown)' })
  formatting: TextFormatting;
}

/**
 * Polymorphic media entity that can represent both images and text content
 */
@ObjectType({ description: 'Polymorphic media that can represent both images and text content' })
export class Media {
  /** Unique identifier for the media */
  @Field(() => ID, { description: 'Unique identifier for the media' })
  id: string;

  /** User-provided title for the media */
  @Field({ description: 'User-provided title for the media' })
  title: string;

  /** Optional description for the media */
  @Field({ nullable: true, description: 'Optional description for the media' })
  description?: string;

  /** ID of the user who owns this media */
  @Field(() => ID, { description: 'ID of the user who owns this media' })
  ownerId: string;

  /** Optional ID of the character this media is associated with */
  @Field(() => ID, { nullable: true, description: 'Optional ID of the character this media is associated with' })
  characterId?: string;

  /** Optional ID of the gallery this media belongs to */
  @Field(() => ID, { nullable: true, description: 'Optional ID of the gallery this media belongs to' })
  galleryId?: string;

  /** Visibility setting for the media */
  @Field(() => Visibility, { description: 'Visibility setting for the media' })
  visibility: Visibility;

  // Content references (nullable FKs)
  /** Foreign key to image content (null for text media) */
  @Field(() => ID, { nullable: true, description: 'Foreign key to image content (null for text media)' })
  imageId?: string;

  /** Foreign key to text content (null for image media) */
  @Field(() => ID, { nullable: true, description: 'Foreign key to text content (null for image media)' })
  textContentId?: string;

  /** When the media was created */
  @Field({ description: 'When the media was created' })
  createdAt: Date;

  /** When the media was last updated */
  @Field({ description: 'When the media was last updated' })
  updatedAt: Date;


}

/**
 * Junction entity for media-tag relationships
 */
@ObjectType({ description: 'Junction entity for media-tag relationships' })
export class MediaTag {
  /** The media this tag is associated with */
  @Field(() => Media, { nullable: true, description: 'The media this tag is associated with' })
  media?: Media;

  /** The tag applied to the media */
  @Field(() => Tag, { description: 'The tag applied to the media' })
  tag: Tag;
}

/**
 * Paginated connection result for media queries
 */
@ObjectType({ description: 'Paginated connection result for media queries' })
export class MediaConnection {
  /** Array of media items for this page */
  @Field(() => [Media], { description: 'Array of media items for this page' })
  media: Media[];

  /** Total number of media items matching the query */
  @Field({ description: 'Total number of media items matching the query' })
  total: number;

  /** Total number of image media items in the full result set */
  @Field({ description: 'Total number of image media items in the full result set' })
  imageCount: number;

  /** Total number of text media items in the full result set */
  @Field({ description: 'Total number of text media items in the full result set' })
  textCount: number;

  /** Whether there are more items available after this page */
  @Field({ description: 'Whether there are more items available after this page' })
  hasMore: boolean;
}

/**
 * Union type for polymorphic media content
 * Resolves to either Image or TextContent based on the presence of specific fields
 */
export const MediaContentUnion = createUnionType({
  name: 'MediaContent',
  types: () => [Image, TextContent] as const,
  resolveType(value) {
    if ('url' in value) {
      return Image;
    }
    if ('content' in value) {
      return TextContent;
    }
    return null;
  },
});