import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Visibility } from '@prisma/client';
import { User } from '../../users/entities/user.entity';
import { Character } from '../../characters/entities/character.entity';

@ObjectType()
export class Tag {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  color?: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class ImageTag {
  @Field(() => Image)
  image: Image;

  @Field(() => Tag)
  tag: Tag;
}

@ObjectType()
export class Gallery {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => ID)
  ownerId: string;

  @Field(() => ID, { nullable: true })
  characterId?: string;

  @Field(() => Visibility)
  visibility: Visibility;

  @Field(() => Int)
  sortOrder: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  owner: User;

  @Field(() => Character, { nullable: true })
  character?: Character;
}

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

  @Field(() => Character, { nullable: true })
  character?: Character;

  @Field(() => Gallery, { nullable: true })
  gallery?: Gallery;

  @Field(() => [ImageTag], { nullable: true })
  tags_rel?: ImageTag[];
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