import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import { Prisma, Visibility } from "@chardb/database";
import * as sharp from "sharp";
import { v4 as uuid } from "uuid";
import { extname } from "path";
import type { Image, Media, User } from "@chardb/database";
import { S3Service } from "./s3.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityResolverService } from "../auth/services/community-resolver.service";
import { CommunityPermission } from "../auth/CommunityPermission";

export interface UploadImageInput {
  file: Express.Multer.File;
  altText?: string;
  isNsfw?: boolean;
  sensitiveContentDescription?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
  // Media record parameters
  characterId?: string;
  galleryId?: string;
  description?: string;
  visibility?: string;
}

export interface UpdateImageInput {
  altText?: string;
  isNsfw?: boolean;
  sensitiveContentDescription?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
}

export interface ImageFilters {
  limit?: number;
  offset?: number;
  uploaderId?: string;
  isNsfw?: boolean;
  search?: string;
  artistId?: string;
}

@Injectable()
export class ImagesService {
  private readonly allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly thumbnailSize = 300;
  private readonly mediumSize = 800;

  constructor(
    private readonly db: DatabaseService,
    private readonly tagsService: TagsService,
    private readonly s3Service: S3Service,
    private readonly permissionService: PermissionService,
    private readonly communityResolverService: CommunityResolverService,
  ) {}

  async upload(
    userId: string,
    input: UploadImageInput,
  ): Promise<Media & { image: Image; owner: User }> {
    const {
      file,
      altText,
      isNsfw = false,
      sensitiveContentDescription,
      artistId,
      artistName,
      artistUrl,
      source,
      characterId,
      galleryId,
      description,
      visibility,
    } = input;

    // Validate file
    this.validateFile(file);

    // NOTE: Character/gallery associations now handled through Media system

    // Verify character edit permission if characterId is provided
    if (characterId) {
      await this.verifyCharacterEditPermission(userId, characterId);
    }

    // Verify artist exists if artistId is provided
    if (artistId) {
      const artist = await this.db.user.findUnique({ where: { id: artistId } });
      if (!artist) {
        throw new BadRequestException("Artist not found");
      }
    }

    // Generate unique filename
    const fileExtension = extname(file.originalname);
    const filename = `${uuid()}${fileExtension}`;

    // Generate thumbnail from original buffer
    const { thumbnail, metadata } = await this.processImage(file.buffer);

    // Generate a shared base key for all size variants of this upload
    const baseKey = `${Date.now()}-${uuid()}`;

    // Upload original (unprocessed) and thumbnail to S3 with shared base key
    const [originalUploadResult, thumbnailUploadResult] = await Promise.all([
      // Upload original unprocessed buffer
      this.s3Service.uploadImage({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        userId,
        sizeVariant: 'original',
        baseKey,
      }),
      // Upload thumbnail with same base key
      this.s3Service.uploadImage({
        buffer: thumbnail,
        filename: file.originalname,
        mimeType: file.mimetype === "image/png" ? "image/png" : "image/jpeg",
        userId,
        sizeVariant: 'thumbnail',
        baseKey,
      }),
    ]);

    const originalUrl = originalUploadResult.url;
    const thumbnailUrl = thumbnailUploadResult.url;

    // Use transaction to create both image and media records
    const result = await this.db.$transaction(async (tx) => {
      // Create image record
      const image = await tx.image.create({
        data: {
          filename,
          originalFilename: file.originalname,
          originalUrl,
          thumbnailUrl,
          altText,
          uploaderId: userId,
          artistId,
          artistName,
          artistUrl,
          source,
          width: metadata.width!,
          height: metadata.height!,
          fileSize: file.size,
          mimeType: file.mimetype,
          isNsfw,
          sensitiveContentDescription,
        },
        include: {
          uploader: true,
          artist: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
        },
      });

      // Create corresponding Media record for unified media system
      const media = await tx.media.create({
        data: {
          title: altText || file.originalname,
          description: description || sensitiveContentDescription,
          ownerId: userId,
          characterId: characterId || null,
          galleryId: galleryId || null,
          visibility: visibility
            ? (visibility.toUpperCase() as Visibility)
            : isNsfw
              ? "PRIVATE"
              : "PUBLIC",
          imageId: image.id, // Link to image record
          textContentId: null, // Null for image media
        },
        include: {
          image: true,
          owner: true,
        },
      });

      if (!media.image) {
        throw new Error("Failed to create image record");
      }

      return media as Media & { image: Image; owner: User };
    });

    return result;
  }

  async findAll(filters: ImageFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      uploaderId,
      isNsfw,
      search,
      artistId,
    } = filters;

    const where: Prisma.ImageWhereInput = {
      AND: [
        // Other filters
        uploaderId ? { uploaderId } : {},
        artistId ? { artistId } : {},
        isNsfw !== undefined ? { isNsfw } : {},

        // Search filter
        search
          ? {
              OR: [
                { altText: { contains: search, mode: "insensitive" } },
                { originalFilename: { contains: search, mode: "insensitive" } },
                { artistName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };

    const [images, total] = await Promise.all([
      this.db.image.findMany({
        where,
        include: {
          uploader: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.image.count({ where }),
    ]);

    return {
      images,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string): Promise<Image> {
    const image = await this.db.image.findUnique({
      where: { id },
      include: {
        uploader: true,
        artist: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!image) {
      throw new NotFoundException("Image not found");
    }

    // NOTE: Visibility now handled through Media system

    return image;
  }

  async update(
    id: string,
    userId: string,
    input: UpdateImageInput,
  ): Promise<Image> {
    const image = await this.findOne(id, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException("You can only edit your own images");
    }

    // NOTE: Character/gallery associations now handled through Media system

    // Verify artist exists if artistId is provided
    if (input.artistId && input.artistId !== image.artistId) {
      const artist = await this.db.user.findUnique({
        where: { id: input.artistId },
      });
      if (!artist) {
        throw new BadRequestException("Artist not found");
      }
    }

    return this.db.image.update({
      where: { id },
      data: input,
      include: {
        uploader: true,
        artist: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const image = await this.findOne(id, userId);

    // Check ownership
    if (image.uploaderId !== userId) {
      throw new ForbiddenException("You can only delete your own images");
    }

    await this.db.image.delete({
      where: { id },
    });

    return true;
  }

  // Image tagging removed - tags should be managed on the associated Media entry instead

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  private async processImage(buffer: Buffer) {
    const logger = new Logger("ImageProcessing");

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      logger.log(
        `Processing image: ${metadata.format} ${metadata.width}x${metadata.height}, size: ${buffer.length} bytes`,
      );

      // For GIFs, preserve original to maintain animations
      if (metadata.format === "gif") {
        // Create static thumbnail only for GIFs
        const thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 80 });

        const thumbnailBuffer = await thumbnail.toBuffer();

        return {
          processedImage: buffer, // Return original GIF buffer
          thumbnail: thumbnailBuffer,
          metadata,
        };
      }

      // Process main image (resize if too large, optimize quality)
      let processedImage = image;

      // Only resize if larger than 4000px (less aggressive than before)
      if (metadata.width! > 4000 || metadata.height! > 4000) {
        processedImage = image.resize(4000, 4000, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      // Format-specific optimization with higher quality
      if (metadata.format === "jpeg") {
        processedImage = processedImage.jpeg({
          quality: 92,
          progressive: true,
        });
      } else if (metadata.format === "png") {
        // Minimal compression for PNGs to preserve transparency
        processedImage = processedImage.png({
          compressionLevel: 6,
          adaptiveFiltering: false,
        });
      } else if (metadata.format === "webp") {
        processedImage = processedImage.webp({ quality: 95, lossless: false });
      }

      // Generate format-appropriate thumbnail
      let thumbnail;
      if (metadata.format === "png") {
        // Keep PNG thumbnails as PNG to preserve transparency
        thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, {
            fit: "cover",
            position: "center",
          })
          .png({ compressionLevel: 6 });
      } else {
        // Use JPEG for other formats
        thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 85 });
      }

      const [processedBuffer, thumbnailBuffer] = await Promise.all([
        processedImage.toBuffer(),
        thumbnail.toBuffer(),
      ]);

      return {
        processedImage: processedBuffer,
        thumbnail: thumbnailBuffer,
        metadata,
      };
    } catch (error) {
      logger.error(`Image processing failed:`, error.message || error);
      logger.error(`Stack trace:`, error.stack);
      throw new BadRequestException("Invalid image file or processing failed");
    }
  }

  /**
   * Verify that a user has permission to edit a character.
   * Uses the same permission logic as CharacterEditGuard:
   * - If user owns the character: requires `canEditOwnCharacter` permission
   * - If user does not own the character: requires `canEditCharacter` permission
   * - If character is orphaned: requires `canCreateOrphanedCharacter` or `canEditCharacter` permission
   * - Permissions are resolved via character→species→community
   */
  private async verifyCharacterEditPermission(
    userId: string,
    characterId: string,
  ): Promise<void> {
    // Fetch character with species info
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: {
        ownerId: true,
        speciesId: true,
      },
    });

    if (!character) {
      throw new NotFoundException("Character not found");
    }

    const isOrphaned = character.ownerId === null;

    // Handle orphaned characters (no owner)
    if (isOrphaned) {
      // Orphaned characters without species cannot be edited
      if (!character.speciesId) {
        throw new ForbiddenException(
          "Cannot upload images to orphaned character without species",
        );
      }

      // Resolve community from species
      const resolvedIds = {
        type: "speciesId" as const,
        value: character.speciesId,
      };
      const community =
        await this.communityResolverService.resolve(resolvedIds);

      if (!community) {
        throw new ForbiddenException(
          "Cannot upload images to character: community not found",
        );
      }

      // For orphaned characters, check if user has permission to manage orphaned characters
      // OR has general edit permission
      const hasOrphanedPermission =
        await this.permissionService.hasCommunityPermission(
          userId,
          community.id,
          CommunityPermission.CanCreateOrphanedCharacter,
        );
      const hasEditPermission =
        await this.permissionService.hasCommunityPermission(
          userId,
          community.id,
          CommunityPermission.CanEditCharacter,
        );

      if (!hasOrphanedPermission && !hasEditPermission) {
        throw new ForbiddenException(
          "You do not have permission to upload images to this orphaned character",
        );
      }

      return;
    }

    // Handle owned characters
    const isOwner = character.ownerId === userId;

    // If no species, only owner can edit
    if (!character.speciesId) {
      if (!isOwner) {
        throw new ForbiddenException(
          "You can only upload images to your own characters",
        );
      }
      return;
    }

    // Resolve community from species
    const resolvedIds = {
      type: "speciesId" as const,
      value: character.speciesId,
    };
    const community = await this.communityResolverService.resolve(resolvedIds);

    if (!community) {
      // No community means only owner can edit
      if (!isOwner) {
        throw new ForbiddenException(
          "You can only upload images to your own characters",
        );
      }
      return;
    }

    // Check appropriate permission based on ownership
    const requiredPermission = isOwner
      ? CommunityPermission.CanEditOwnCharacter
      : CommunityPermission.CanEditCharacter;

    const hasPermission = await this.permissionService.hasCommunityPermission(
      userId,
      community.id,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        isOwner
          ? "You do not have permission to upload images to your own characters in this community"
          : "You do not have permission to upload images to this character",
      );
    }
  }

  private async verifyGalleryOwnership(
    galleryId: string,
    userId: string,
  ): Promise<void> {
    const gallery = await this.db.gallery.findUnique({
      where: { id: galleryId },
      select: { ownerId: true },
    });

    if (!gallery) {
      throw new NotFoundException("Gallery not found");
    }

    if (gallery.ownerId !== userId) {
      throw new ForbiddenException(
        "You can only upload images to your own galleries",
      );
    }
  }

  /**
   * Checks if an image is orphaned and deletes it from S3 and database if so.
   * An image is considered orphaned if it's not referenced by:
   * - Any Media record
   * - Any User avatar
   * - Any ItemType
   *
   * @param imageId The ID of the image to check
   * @returns Promise<boolean> True if image was orphaned and deleted, false otherwise
   */
  async cleanupOrphanedImage(imageId: string): Promise<boolean> {
    const logger = new Logger('ImagesService');
    logger.log(`[cleanupOrphanedImage] Checking if image ${imageId} is orphaned`);

    // Check all references in parallel
    const [mediaCount, userAvatarCount, itemTypeCount] = await Promise.all([
      this.db.media.count({ where: { imageId } }),
      this.db.user.count({ where: { avatarImageId: imageId } }),
      this.db.itemType.count({ where: { imageId } }),
    ]);

    const totalReferences = mediaCount + userAvatarCount + itemTypeCount;
    logger.log(
      `[cleanupOrphanedImage] Image ${imageId} references: media=${mediaCount}, avatars=${userAvatarCount}, itemTypes=${itemTypeCount}, total=${totalReferences}`
    );

    // If image is still referenced, don't delete
    if (totalReferences > 0) {
      logger.debug(`Image ${imageId} still referenced by ${totalReferences} record(s), skipping deletion`);
      return false;
    }

    // Image is orphaned, fetch it to get URLs
    const image = await this.db.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      logger.warn(`[cleanupOrphanedImage] Image ${imageId} not found in database`);
      return false;
    }

    logger.log(`[cleanupOrphanedImage] Image ${imageId} is orphaned, deleting from S3 and database`);
    logger.log(`[cleanupOrphanedImage] URLs - original: ${image.originalUrl}, thumbnail: ${image.thumbnailUrl}`);

    // Delete from S3 (skip base64 images)
    if (image.originalUrl && !image.originalUrl.startsWith('data:')) {
      try {
        const urlsToDelete = [image.originalUrl];
        if (image.thumbnailUrl) {
          urlsToDelete.push(image.thumbnailUrl);
        }

        await this.s3Service.deleteImages(urlsToDelete);
        logger.log(`Deleted ${urlsToDelete.length} image(s) from S3`);
      } catch (error) {
        logger.error(`Failed to delete images from S3: ${error.message}`, error.stack);
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete from database
    await this.db.image.delete({
      where: { id: imageId },
    });

    logger.log(`Successfully deleted orphaned image ${imageId} from database and storage`);
    return true;
  }
}
