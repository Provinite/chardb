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
 * Maps a Prisma Image model to a GraphQL Image entity
 */
export function mapPrismaImageToGraphQL(prismaImage: PrismaImage): Image {
  return {
    id: prismaImage.id,
    filename: prismaImage.filename,
    originalFilename: prismaImage.originalFilename,
    originalUrl: prismaImage.originalUrl,
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
    sensitiveContentDescription: prismaImage.sensitiveContentDescription ?? undefined,
    moderationStatus: prismaImage.moderationStatus,
    createdAt: prismaImage.createdAt,
    updatedAt: prismaImage.updatedAt,
    uploader: mapPrismaUserToGraphQL(prismaImage.uploader),
    artist: prismaImage.artist ? mapPrismaUserToGraphQL(prismaImage.artist) : undefined,
    tags_rel: [],
    likesCount: 0,
    userHasLiked: false,
  };
}
