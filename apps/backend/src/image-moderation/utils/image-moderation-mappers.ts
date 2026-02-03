import { Prisma } from "@chardb/database";
import {
  ImageModerationAction,
  ImageModerationQueueConnection,
  ImageModerationQueueItem,
} from "../entities/image-moderation-action.entity";
import { mapPrismaUserToGraphQL } from "../../users/utils/user-resolver-mappers";
import { mapPrismaImageToGraphQL } from "../../images/utils/image-resolver-mappers";

/**
 * Shared include pattern for Image with uploader and artist
 */
export const imageWithUploaderAndArtistInclude = {
  uploader: true,
  artist: true,
} as const;

/**
 * Shared include pattern for moderation action with full image and moderator
 */
export const moderationActionInclude = {
  image: { include: imageWithUploaderAndArtistInclude },
  moderator: true,
} as const;

/**
 * Shared include pattern for queue images with full relation chain
 */
export const queueImageInclude = {
  ...imageWithUploaderAndArtistInclude,
  media: {
    include: {
      character: {
        include: {
          species: {
            include: {
              community: true,
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Prisma payload type for ImageModerationAction with full includes
 */
export type PrismaImageModerationAction = Prisma.ImageModerationActionGetPayload<{
  include: typeof moderationActionInclude;
}>;

/**
 * Prisma payload type for queue item image with full relation chain
 */
export type PrismaQueueImage = Prisma.ImageGetPayload<{
  include: typeof queueImageInclude;
}>;

/**
 * Maps Prisma ImageModerationAction to GraphQL entity
 */
export function mapPrismaImageModerationActionToGraphQL(
  prismaAction: PrismaImageModerationAction
): ImageModerationAction {
  return {
    id: prismaAction.id,
    imageId: prismaAction.imageId,
    image: mapPrismaImageToGraphQL(prismaAction.image),
    moderatorId: prismaAction.moderatorId,
    moderator: mapPrismaUserToGraphQL(prismaAction.moderator),
    action: prismaAction.action,
    reason: prismaAction.reason ?? undefined,
    reasonText: prismaAction.reasonText ?? undefined,
    createdAt: prismaAction.createdAt,
  };
}

/**
 * Maps Prisma queue image to GraphQL ImageModerationQueueItem
 */
export function mapPrismaQueueImageToGraphQL(
  prismaImage: PrismaQueueImage
): ImageModerationQueueItem {
  const media = prismaImage.media[0];
  const character = media?.character;
  const community = character?.species?.community;

  return {
    image: mapPrismaImageToGraphQL(prismaImage),
    mediaTitle: media?.title ?? undefined,
    characterName: character?.name ?? undefined,
    characterId: character?.id ?? undefined,
    communityName: community?.name ?? undefined,
    communityId: community?.id ?? undefined,
  };
}

/**
 * Service result type for queue queries
 */
export interface QueueServiceResult {
  items: PrismaQueueImage[];
  total: number;
  hasMore: boolean;
}

/**
 * Maps service queue result to GraphQL ImageModerationQueueConnection
 */
export function mapQueueResultToGraphQL(
  result: QueueServiceResult
): ImageModerationQueueConnection {
  return {
    items: result.items.map(mapPrismaQueueImageToGraphQL),
    total: result.total,
    hasMore: result.hasMore,
  };
}
