import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import { Prisma, Visibility, ModerationStatus } from "@chardb/database";
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
  title?: string;
  altText?: string;
  isNsfw?: boolean;
  sensitiveContentDescription?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
  // Media record parameters
  characterId?: string;
  itemTypeId?: string;
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
      title,
      altText,
      isNsfw = false,
      sensitiveContentDescription,
      artistId,
      artistName,
      artistUrl,
      source,
      characterId,
      itemTypeId,
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

    // Verify item type edit permission if itemTypeId is provided
    if (itemTypeId) {
      await this.verifyItemTypeEditPermission(userId, itemTypeId);
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

    // Generate all image variants from original buffer
    const { thumbnail, medium, metadata } = await this.processImage(
      file.buffer,
    );

    // Generate imageId upfront for S3 key generation
    const imageId = uuid();

    // Determine mime types for each variant based on format
    const thumbnailMimeType = this.getThumbnailMimeType(file.mimetype);
    const mediumMimeType = this.getMediumMimeType(file.mimetype);

    // Upload original, medium, and thumbnail to S3 using imageId
    const [originalUploadResult, mediumUploadResult, thumbnailUploadResult] =
      await Promise.all([
        // Upload original unprocessed buffer
        this.s3Service.uploadImage({
          buffer: file.buffer,
          filename: file.originalname,
          mimeType: file.mimetype,
          imageId,
          sizeVariant: "original",
        }),
        // Upload medium (web-optimized display size)
        this.s3Service.uploadImage({
          buffer: medium,
          filename: file.originalname,
          mimeType: mediumMimeType,
          imageId,
          sizeVariant: "medium",
        }),
        // Upload thumbnail
        this.s3Service.uploadImage({
          buffer: thumbnail,
          filename: file.originalname,
          mimeType: thumbnailMimeType,
          imageId,
          sizeVariant: "thumbnail",
        }),
      ]);

    const originalUrl = originalUploadResult.url;
    const mediumUrl = mediumUploadResult.url;
    const thumbnailUrl = thumbnailUploadResult.url;

    // Use transaction to create both image and media records
    const result = await this.db.$transaction(async (tx) => {
      // Create image record with pre-generated ID
      const image = await tx.image.create({
        data: {
          id: imageId, // Use pre-generated UUID
          filename,
          originalFilename: file.originalname,
          originalUrl,
          mediumUrl,
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
          title: title || file.originalname,
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

      // If itemTypeId is provided, update the ItemType to reference this image
      if (itemTypeId) {
        await tx.itemType.update({
          where: { id: itemTypeId },
          data: { imageId: image.id },
        });
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

    // Get moderation visibility filter
    const moderationFilter = this.getModerationVisibilityFilter();

    const where: Prisma.ImageWhereInput = {
      AND: [
        // Moderation status filter
        moderationFilter,
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

  async findOne(id: string, userId?: string) {
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

    return image;
  }

  /**
   * Build Prisma filter for moderation visibility in general image lists.
   * Lists should ONLY show APPROVED images - pending/rejected images are
   * viewed through dedicated interfaces (moderation queue, my pending uploads).
   */
  private getModerationVisibilityFilter(): Prisma.ImageWhereInput {
    // All image lists only show approved images
    // Users see their pending uploads via dedicated "my pending uploads" query
    // Moderators see pending images via the moderation queue
    return { moderationStatus: ModerationStatus.APPROVED };
  }

  /**
   * Get pending uploads for a specific user (for "My Pending Uploads" view)
   */
  async findPendingUploads(userId: string) {
    const images = await this.db.image.findMany({
      where: {
        uploaderId: userId,
        moderationStatus: ModerationStatus.PENDING,
      },
      include: {
        uploader: true,
        artist: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return images;
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

      // For GIFs, preserve animation in both original and medium, create static thumbnail
      if (metadata.format === "gif") {
        // Resize GIF for medium variant if needed, preserving animation
        let mediumBuffer = buffer;
        if (
          metadata.width! > this.mediumSize ||
          metadata.height! > this.mediumSize
        ) {
          const mediumGif = sharp(buffer, { animated: true })
            .resize(this.mediumSize, this.mediumSize, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .gif();
          mediumBuffer = await mediumGif.toBuffer();
        }

        // Create static thumbnail for GIFs
        const thumbnail = image
          .resize(this.thumbnailSize, this.thumbnailSize, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 80 });

        const thumbnailBuffer = await thumbnail.toBuffer();

        return {
          medium: mediumBuffer,
          thumbnail: thumbnailBuffer,
          metadata,
        };
      }

      // Generate medium (800px web-optimized) variant
      // Clone the image instance for independent processing
      let mediumImage = sharp(buffer).resize(this.mediumSize, this.mediumSize, {
        fit: "inside",
        withoutEnlargement: true,
      });

      // Format-specific optimization for medium variant
      if (metadata.format === "png") {
        // PNG → WebP for smaller file size while preserving transparency
        mediumImage = mediumImage.webp({ quality: 100, lossless: false });
      } else if (metadata.format === "jpeg") {
        // JPEG → JPEG optimized
        mediumImage = mediumImage.jpeg({
          quality: 100,
          progressive: true,
        });
      } else if (metadata.format === "webp") {
        // WebP → WebP optimized
        mediumImage = mediumImage.webp({ quality: 100, lossless: false });
      }

      // Generate thumbnail variant
      // Clone the image instance for independent processing
      let thumbnail = sharp(buffer).resize(
        this.thumbnailSize,
        this.thumbnailSize,
        {
          fit: "cover",
          position: "center",
        },
      );

      // Format-specific optimization for thumbnail
      if (metadata.format === "png") {
        // PNG → WebP for smaller file size while preserving transparency
        thumbnail = thumbnail.webp({ quality: 85, lossless: false });
      } else if (metadata.format === "jpeg") {
        // JPEG → JPEG
        thumbnail = thumbnail.jpeg({ quality: 85 });
      } else if (metadata.format === "webp") {
        // WebP → WebP
        thumbnail = thumbnail.webp({ quality: 85, lossless: false });
      }

      const [mediumBuffer, thumbnailBuffer] = await Promise.all([
        mediumImage.toBuffer(),
        thumbnail.toBuffer(),
      ]);

      return {
        medium: mediumBuffer,
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
   * Determine MIME type for medium variant based on original format
   */
  private getMediumMimeType(originalMimeType: string): string {
    if (originalMimeType === "image/png") {
      return "image/webp"; // PNG → WebP
    } else if (
      originalMimeType === "image/jpeg" ||
      originalMimeType === "image/jpg"
    ) {
      return "image/jpeg"; // JPEG → JPEG
    } else if (originalMimeType === "image/webp") {
      return "image/webp"; // WebP → WebP
    } else if (originalMimeType === "image/gif") {
      return "image/gif"; // GIF → GIF (preserves animation)
    }
    return originalMimeType;
  }

  /**
   * Determine MIME type for thumbnail variant based on original format
   */
  private getThumbnailMimeType(originalMimeType: string): string {
    if (originalMimeType === "image/png") {
      return "image/webp"; // PNG → WebP
    } else if (
      originalMimeType === "image/jpeg" ||
      originalMimeType === "image/jpg"
    ) {
      return "image/jpeg"; // JPEG → JPEG
    } else if (originalMimeType === "image/webp") {
      return "image/webp"; // WebP → WebP
    } else if (originalMimeType === "image/gif") {
      return "image/jpeg"; // GIF → Static JPEG thumbnail
    }
    return originalMimeType;
  }

  /**
   * Verify that a user has permission to upload images to a character.
   * Checks upload-specific permissions: `canUploadOwnCharacterImages` / `canUploadCharacterImages`
   *
   * Special cases:
   * - Characters without species: owner can always upload
   * - Orphaned characters: requires `canUploadCharacterImages` or `canCreateOrphanedCharacter`
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

      // For orphaned characters, check upload permission or orphaned character permission
      const [hasUploadPermission, hasOrphanedPermission] = await Promise.all([
        this.permissionService.hasCommunityPermission(
          userId,
          community.id,
          CommunityPermission.CanUploadCharacterImages,
        ),
        this.permissionService.hasCommunityPermission(
          userId,
          community.id,
          CommunityPermission.CanCreateOrphanedCharacter,
        ),
      ]);

      if (!hasUploadPermission && !hasOrphanedPermission) {
        throw new ForbiddenException(
          "You do not have permission to upload images to this orphaned character",
        );
      }

      return;
    }

    // Handle owned characters
    const isOwner = character.ownerId === userId;

    // If no species, only owner can upload (no community permissions to check)
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
      // No community means only owner can upload
      if (!isOwner) {
        throw new ForbiddenException(
          "You can only upload images to your own characters",
        );
      }
      return;
    }

    // Check upload-specific permissions only
    const uploadPermission = isOwner
      ? CommunityPermission.CanUploadOwnCharacterImages
      : CommunityPermission.CanUploadCharacterImages;

    const hasUploadPermission =
      await this.permissionService.hasCommunityPermission(
        userId,
        community.id,
        uploadPermission,
      );

    if (!hasUploadPermission) {
      throw new ForbiddenException(
        isOwner
          ? "You do not have permission to upload images to your own characters in this community"
          : "You do not have permission to upload images to this character",
      );
    }
  }

  /**
   * Verify user has permission to edit an item type (upload images).
   * Item types belong to a community and require permission to edit.
   */
  private async verifyItemTypeEditPermission(
    userId: string,
    itemTypeId: string,
  ): Promise<void> {
    // Fetch item type with community info
    const itemType = await this.db.itemType.findUnique({
      where: { id: itemTypeId },
      select: {
        communityId: true,
      },
    });

    if (!itemType) {
      throw new NotFoundException("Item type not found");
    }

    // Check if user has permission to manage items in this community
    const hasPermission = await this.permissionService.hasCommunityPermission(
      userId,
      itemType.communityId,
      CommunityPermission.CanManageItems,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        "You do not have permission to upload images to this item type",
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
    const logger = new Logger("ImagesService");
    logger.log(
      `[cleanupOrphanedImage] Checking if image ${imageId} is orphaned`,
    );

    // Check all references in parallel
    const [mediaCount, userAvatarCount, itemTypeCount] = await Promise.all([
      this.db.media.count({ where: { imageId } }),
      this.db.user.count({ where: { avatarImageId: imageId } }),
      this.db.itemType.count({ where: { imageId } }),
    ]);

    const totalReferences = mediaCount + userAvatarCount + itemTypeCount;
    logger.log(
      `[cleanupOrphanedImage] Image ${imageId} references: media=${mediaCount}, avatars=${userAvatarCount}, itemTypes=${itemTypeCount}, total=${totalReferences}`,
    );

    // If image is still referenced, don't delete
    if (totalReferences > 0) {
      logger.debug(
        `Image ${imageId} still referenced by ${totalReferences} record(s), skipping deletion`,
      );
      return false;
    }

    // Image is orphaned, fetch it to get URLs
    const image = await this.db.image.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      logger.warn(
        `[cleanupOrphanedImage] Image ${imageId} not found in database`,
      );
      return false;
    }

    logger.log(
      `[cleanupOrphanedImage] Image ${imageId} is orphaned, deleting from S3 and database`,
    );
    logger.log(
      `[cleanupOrphanedImage] URLs - original: ${image.originalUrl}, thumbnail: ${image.thumbnailUrl}`,
    );

    // Delete from S3 (skip base64 images)
    if (image.originalUrl && !image.originalUrl.startsWith("data:")) {
      try {
        const urlsToDelete = [image.originalUrl];
        if (image.thumbnailUrl) {
          urlsToDelete.push(image.thumbnailUrl);
        }

        await this.s3Service.deleteImages(urlsToDelete);
        logger.log(`Deleted ${urlsToDelete.length} image(s) from S3`);
      } catch (error) {
        logger.error(
          `Failed to delete images from S3: ${error.message}`,
          error.stack,
        );
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete from database
    await this.db.image.delete({
      where: { id: imageId },
    });

    logger.log(
      `Successfully deleted orphaned image ${imageId} from database and storage`,
    );
    return true;
  }
}
