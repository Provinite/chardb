import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Visibility } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';
import { Tag } from '../../shared/entities/tag.entity';
import { Gallery } from '../../galleries/entities/gallery.entity';

@ObjectType()
export class Image {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field()
  originalFilename: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field({ nullable: true })
  altText?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ID)
  uploaderId: string;

  @Field(() => ID, { nullable: true })
  characterId?: string;

  @Field(() => ID, { nullable: true })
  galleryId?: string;

  // Artist attribution
  @Field(() => ID, { nullable: true })
  artistId?: string;

  @Field({ nullable: true })
  artistName?: string;

  @Field({ nullable: true })
  artistUrl?: string;

  @Field({ nullable: true })
  source?: string;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;

  @Field(() => Int)
  fileSize: number;

  @Field()
  mimeType: string;

  @Field()
  isNsfw: boolean;

  @Field(() => Visibility)
  visibility: Visibility;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  uploader: User;

  @Field(() => User, { nullable: true })
  artist?: User;

  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => [ImageTag], { nullable: true })
  tags_rel?: ImageTag[];

  // Social features
  @Field(() => Int)
  likesCount: number;

  @Field(() => Boolean)
  userHasLiked: boolean;
}

@ObjectType()
export class ImageTag {
  @Field(() => Image)
  image: Image;

  @Field(() => Tag)
  tag: Tag;
}

@ObjectType()
export class ImageConnection {
  @Field(() => [Image])
  images: Image[];

  @Field(() => Int)
  total: number;

  @Field()
  hasMore: boolean;
}