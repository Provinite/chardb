import { Prisma } from "@chardb/database";
import { Image } from "../entities/image.entity";
import { mapPrismaUserToGraphQL } from "../../users/utils/user-resolver-mappers";

type PrismaImage = Prisma.ImageGetPayload<{
  include: {
    uploader: true;
    artist: true;
  };
}>;

/**
 * The deferring moderator is optional rather than part of `PrismaImage`,
 * because only the moderation queue has any use for the name. Requiring it
 * would make seven unrelated call sites join a user row that is null on
 * essentially every image.
 */
type PrismaImageWithDeferrer = PrismaImage & {
  deferredBy?: Prisma.UserGetPayload<Record<string, never>> | null;
};

/**
 * Maps a Prisma Image model to a GraphQL Image entity
 */
export function mapPrismaImageToGraphQL(
  prismaImage: PrismaImageWithDeferrer,
): Image {
  return {
    id: prismaImage.id,
    originalFilename: prismaImage.originalFilename,
    originalUrl: prismaImage.originalUrl,
    mediumUrl: prismaImage.mediumUrl ?? undefined,
    thumbnailUrl: prismaImage.thumbnailUrl ?? undefined,
    altText: prismaImage.altText ?? undefined,
    uploaderId: prismaImage.uploaderId,
    artistId: prismaImage.artistId ?? undefined,
    artistName: prismaImage.artistName ?? undefined,
    artistUrl: prismaImage.artistUrl ?? undefined,
    source: prismaImage.source ?? undefined,
    width: prismaImage.width,
    height: prismaImage.height,
    fileSize: prismaImage.fileSize,
    mimeType: prismaImage.mimeType,
    isNsfw: prismaImage.isNsfw,
    sensitiveContentDescription:
      prismaImage.sensitiveContentDescription ?? undefined,
    moderationStatus: prismaImage.moderationStatus,
    deferredAt: prismaImage.deferredAt ?? undefined,
    deferredById: prismaImage.deferredById ?? undefined,
    deferralCount: prismaImage.deferralCount,
    deferralNote: prismaImage.deferralNote ?? undefined,
    createdAt: prismaImage.createdAt,
    updatedAt: prismaImage.updatedAt,
    uploader: mapPrismaUserToGraphQL(prismaImage.uploader),
    artist: prismaImage.artist
      ? mapPrismaUserToGraphQL(prismaImage.artist)
      : undefined,
    deferredBy: prismaImage.deferredBy
      ? mapPrismaUserToGraphQL(prismaImage.deferredBy)
      : undefined,
    tags_rel: [],
    likesCount: 0,
    userHasLiked: false,
  };
}
