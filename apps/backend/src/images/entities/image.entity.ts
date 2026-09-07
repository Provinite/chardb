import { ObjectType, Field, ID, Int } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";
import { Tag } from "../../shared/entities/tag.entity";
import { ModerationStatus } from "@prisma/client";

/**
 * Declared before `Image` on purpose. `emitDecoratorMetadata` writes the
 * annotated type of `Image.thumbnailCrop` into a `design:type` entry that is
 * evaluated while the class body runs, so a class referenced there has to
 * already exist -- unlike `ImageTag`, which is only ever referenced as an
 * array and so resolves to `Array`.
 */
@ObjectType({
  description:
    "A thumbnail framing rect, in the original image's pixels after EXIF rotation is applied -- the same coordinates a browser reports for the image, so a cropper's output can be sent back unchanged.",
})
export class ImageCrop {
  @Field(() => Int)
  x: number;

  @Field(() => Int)
  y: number;

  @Field(() => Int)
  width: number;

  @Field(() => Int)
  height: number;
}

@ObjectType()
export class Image {
  @Field(() => ID)
  id: string;

  @Field()
  originalFilename: string;

  @Field()
  originalUrl: string;

  @Field({ nullable: true })
  mediumUrl?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field({ nullable: true })
  altText?: string;

  @Field(() => ID)
  uploaderId: string;

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

  @Field({ nullable: true })
  sensitiveContentDescription?: string;

  @Field(() => ImageCrop, {
    nullable: true,
    description:
      "The region of the original this image's thumbnail is cropped from. Null means the thumbnail is a centre crop, which is what every image did before a crop could be chosen.",
  })
  thumbnailCrop?: ImageCrop;

  @Field(() => ModerationStatus, {
    description: "Current moderation status of the image",
  })
  moderationStatus: ModerationStatus;

  @Field({
    nullable: true,
    description:
      "When this image was last sent to the back of the moderation queue. Null means it has never been deferred.",
  })
  deferredAt?: Date;

  @Field(() => ID, { nullable: true })
  deferredById?: string;

  @Field(() => Int, {
    description: "How many times this image has been sent to the back",
  })
  deferralCount: number;

  @Field({
    nullable: true,
    description: "Why the last moderator passed on this image",
  })
  deferralNote?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => User)
  uploader: User;

  @Field(() => User, { nullable: true })
  artist?: User;

  @Field(() => User, {
    nullable: true,
    description: "The moderator who last sent this image to the back",
  })
  deferredBy?: User;

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
