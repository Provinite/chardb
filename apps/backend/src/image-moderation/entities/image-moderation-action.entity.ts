import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { ModerationStatus, ModerationRejectionReason } from '@prisma/client';
import { Image } from '../../images/entities/image.entity';
import { User } from '../../users/entities/user.entity';

@ObjectType({ description: 'A moderation action taken on an image' })
export class ImageModerationAction {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  imageId: string;

  @Field(() => Image)
  image: Image;

  @Field(() => ID)
  moderatorId: string;

  @Field(() => User)
  moderator: User;

  @Field(() => ModerationStatus, { description: 'The moderation action taken' })
  action: ModerationStatus;

  @Field(() => ModerationRejectionReason, { nullable: true, description: 'The reason for rejection (if rejected)' })
  reason?: ModerationRejectionReason;

  @Field({ nullable: true, description: 'Additional details about the rejection' })
  reasonText?: string;

  @Field({ description: 'When the moderation action was taken' })
  createdAt: Date;
}

@ObjectType({ description: 'An item in the moderation queue' })
export class ImageModerationQueueItem {
  @Field(() => Image)
  image: Image;

  @Field({ nullable: true, description: 'Title of the associated media (if any)' })
  mediaTitle?: string;

  @Field({ nullable: true, description: 'Name of the associated character (if any)' })
  characterName?: string;

  @Field(() => ID, { nullable: true, description: 'ID of the associated character (if any)' })
  characterId?: string;

  @Field({ nullable: true, description: 'Name of the associated community (if any)' })
  communityName?: string;

  @Field(() => ID, { nullable: true, description: 'ID of the associated community (if any)' })
  communityId?: string;
}

@ObjectType({ description: 'Paginated list of images in the moderation queue' })
export class ImageModerationQueueConnection {
  @Field(() => [ImageModerationQueueItem])
  items: ImageModerationQueueItem[];

  @Field(() => Int, { description: 'Total count of pending images' })
  total: number;

  @Field({ description: 'Whether there are more images after this page' })
  hasMore: boolean;
}
