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

@ObjectType()
export class TextContent {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field()
  wordCount: number;

  @Field(() => TextFormatting)
  formatting: TextFormatting;
}

@ObjectType()
export class Media {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ID)
  ownerId: string;

  @Field(() => ID, { nullable: true })
  characterId?: string;

  @Field(() => ID, { nullable: true })
  galleryId?: string;

  @Field(() => Visibility)
  visibility: Visibility;

  // Content references (nullable FKs)
  @Field(() => ID, { nullable: true })
  imageId?: string;

  @Field(() => ID, { nullable: true })
  textContentId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  owner: User;

  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => [MediaTag], { nullable: true })
  tags_rel?: MediaTag[];

  // Content union - only one will be populated based on nullable FKs
  @Field(() => Image, { nullable: true })
  image?: Partial<Image>;

  @Field(() => TextContent, { nullable: true })
  textContent?: Partial<TextContent>;

  // Social features
  @Field()
  likesCount: number;

  @Field()
  userHasLiked: boolean;
}

@ObjectType()
export class MediaTag {
  @Field(() => Media, { nullable: true })
  media?: Media;

  @Field(() => Tag)
  tag: Tag;
}

@ObjectType()
export class MediaConnection {
  @Field(() => [Media])
  media: Media[];

  @Field()
  total: number;

  @Field()
  hasMore: boolean;
}

// Create union type for content
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