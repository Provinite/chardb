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
import { notDeleted } from "../common/utils/prisma-filters";
import * as sharp from "sharp";
import { v4 as uuid } from "uuid";
import { extname } from "path";
import type { Image, Media, User } from "@chardb/database";
import { S3Service } from "./s3.service";
import { PermissionService } from "../auth/PermissionService";
import { CommunityResolverService } from "../auth/services/community-resolver.service";
import { CommunityPermission } from "../auth/CommunityPermission";
import {
  ThumbnailCrop,
  cropToColumns,
  orientedDimensions,
  validateThumbnailCrop,
} from "./thumbnail-crop";

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
  /** Thumbnail framing chosen before upload; centre crop when absent. */
  thumbnailCrop?: ThumbnailCrop;
  // Media record parameters
  characterId?: string;
  itemTypeId?: string;
  galleryId?: string;
  description?: string;
  visibility?: string;
  /**
   * The community whose moderators should review this upload, for uploads
   * that have no character to answer that through. Taken from the host the
   * uploader was on. Ignored when `characterId` is given -- see
   * `Media.communityId`.
   */
  communityId?: string;
}

export interface UpdateImageInput {
  altText?: string;
  isNsfw?: boolean;
  sensitiveContentDescription?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
  /**
   * A new thumbnail framing. `null` clears it back to a centre crop; omitting
   * it leaves the existing framing alone. Either of the first two re-renders
   * the thumbnail from the original.
   */
  thumbnailCrop?: ThumbnailCrop | null;
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
      thumbnailCrop,
      characterId,
      itemTypeId,
      galleryId,
      description,
      visibility,
      communityId,
    } = input;

    // Validate file
    this.validateFile(file);

    // Which community reviews this, when no character says. A character
    // resolves its own community and outranks anything the client sent, so
    // the column is only written for media that has none -- otherwise the row
    // would carry a second answer that nothing reads.
    const reviewingCommunityId = characterId
      ? null
      : await this.resolveReviewingCommunity(userId, communityId);

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

    // Generate all image variants from original buffer. An out-of-bounds crop
    // is rejected here, before anything reaches S3.
    const { thumbnail, medium, width, height } = await this.processImage(
      file.buffer,
      thumbnailCrop,
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
          width,
          height,
          fileSize: file.size,
          mimeType: file.mimetype,
          isNsfw,
          sensitiveContentDescription,
          ...cropToColumns(thumbnailCrop ?? null),
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
          communityId: reviewingCommunityId,
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

  // No viewer argument: image visibility is decided by moderation status
  // alone (see getModerationVisibilityFilter), never by who is asking. The
  // parameter this used to take was read by nothing and had been passed at
  // every call site for long enough to look like it meant something.
  async findAll(filters: ImageFilters = {}) {
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

  async findOne(id: string) {
    const image = await this.db.image.findUnique({
      where: { id },
      include: {
        uploader: true,
        artist: true,
        // Joined here because this is the path the moderation queue reads an
        // image through, and a deferred entry has to be able to say who passed
        // on it. Null on all but a handful of rows.
        deferredBy: true,
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
    const image = await this.findOne(id);

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

    const { thumbnailCrop, ...fields } = input;

    // Re-render before writing the row. If the fetch, the render or the upload
    // fails, the image keeps the thumbnail it already had rather than ending
    // up with a row pointing at an object that was never created.
    const reframed =
      thumbnailCrop === undefined
        ? null
        : {
            ...cropToColumns(thumbnailCrop),
            thumbnailUrl: await this.regenerateThumbnail(image, thumbnailCrop),
          };

    const updated = await this.db.image.update({
      where: { id },
      data: { ...fields, ...(reframed ?? {}) },
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

    // Only once the row points at the new object. The other order puts a 404
    // in every listing that already rendered this image if the write fails.
    if (
      reframed &&
      image.thumbnailUrl &&
      image.thumbnailUrl !== reframed.thumbnailUrl
    ) {
      await this.s3Service.deleteImage(image.thumbnailUrl);
    }

    return updated;
  }

  /**
   * Re-render an image's thumbnail from its stored original, at a new key.
   *
   * A new key rather than a rewrite because objects go up with
   * `Cache-Control: immutable, max-age=31536000` -- rewriting
   * `{imageId}/thumbnail.png` in place would leave CloudFront, and every
   * browser that has already loaded it, showing the old framing for a year.
   * The caller deletes the superseded object once the row has moved.
   *
   * Bounds are checked against the original's own dimensions rather than the
   * row's `width`/`height`: rows written before EXIF rotation was applied hold
   * the stored size, which is transposed from what the cropper measured.
   */
  private async regenerateThumbnail(
    image: Image,
    crop: ThumbnailCrop | null,
  ): Promise<string> {
    const original = await this.s3Service.getImage(image.originalUrl);
    const metadata = await sharp(original).metadata();

    const { width, height } = orientedDimensions(
      metadata.width!,
      metadata.height!,
      metadata.orientation,
    );

    if (crop) {
      validateThumbnailCrop(crop, width, height);
    }

    const thumbnail = await this.renderThumbnail(
      original,
      metadata.format,
      crop,
    );

    const { url } = await this.s3Service.uploadImage({
      buffer: thumbnail,
      filename: image.originalFilename,
      mimeType: this.getThumbnailMimeType(image.mimeType),
      imageId: image.id,
      sizeVariant: "thumbnail",
      keySuffix: uuid().slice(0, 8),
    });

    return url;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const image = await this.findOne(id);

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

  /**
   * Render the 300x300 thumbnail, framed by `crop` when one was chosen.
   *
   * `.rotate()` comes first on every path. With no argument it applies the
   * image's EXIF orientation, which does two things: it puts the pipeline into
   * the same coordinate space the crop rect was measured in (see the note on
   * `ThumbnailCrop`), and it stops a photo carrying an orientation tag from
   * thumbnailing sideways -- which is what happened before, because sharp
   * drops the tag on output and nothing re-applied the rotation.
   *
   * With no rect this is the historical framing: cover-fit on the centre.
   */
  private async renderThumbnail(
    buffer: Buffer,
    format: string | undefined,
    crop?: ThumbnailCrop | null,
  ): Promise<Buffer> {
    const oriented = sharp(buffer).rotate();

    const framed = crop
      ? oriented.extract({
          left: crop.x,
          top: crop.y,
          width: crop.width,
          height: crop.height,
        })
      : oriented;

    const resized = framed.resize(this.thumbnailSize, this.thumbnailSize, {
      fit: "cover",
      position: "center",
    });

    switch (format) {
      // A GIF thumbnails to a still: this pipeline is built without
      // `{ animated: true }`, so it reads the first frame only.
      case "gif":
        return resized.jpeg({ quality: 80 }).toBuffer();
      // PNG → WebP for smaller file size while preserving transparency
      case "png":
        return resized.webp({ quality: 85, lossless: false }).toBuffer();
      case "jpeg":
        return resized.jpeg({ quality: 85 }).toBuffer();
      case "webp":
        return resized.webp({ quality: 85, lossless: false }).toBuffer();
      default:
        return resized.toBuffer();
    }
  }

  private async processImage(buffer: Buffer, crop?: ThumbnailCrop | null) {
    const logger = new Logger("ImageProcessing");

    try {
      const metadata = await sharp(buffer).metadata();

      // What a browser paints, which is not always what is stored -- see
      // `orientedDimensions`. This is the space the crop rect is measured in,
      // and the size recorded on the row.
      const { width, height } = orientedDimensions(
        metadata.width!,
        metadata.height!,
        metadata.orientation,
      );

      logger.log(
        `Processing image: ${metadata.format} ${width}x${height} (stored ${metadata.width}x${metadata.height}), size: ${buffer.length} bytes`,
      );

      if (crop) {
        validateThumbnailCrop(crop, width, height);
      }

      // For GIFs, preserve animation in the medium variant; the thumbnail is
      // always a still.
      if (metadata.format === "gif") {
        // Resize GIF for medium variant if needed, preserving animation
        let mediumBuffer = buffer;
        if (width > this.mediumSize || height > this.mediumSize) {
          const mediumGif = sharp(buffer, { animated: true })
            .resize(this.mediumSize, this.mediumSize, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .gif();
          mediumBuffer = await mediumGif.toBuffer();
        }

        return {
          medium: mediumBuffer,
          thumbnail: await this.renderThumbnail(buffer, metadata.format, crop),
          metadata,
          width,
          height,
        };
      }

      // Generate medium (800px web-optimized) variant. Rotated for the same
      // reason as the thumbnail: without it an EXIF-rotated photo would come
      // out upright as a thumbnail and sideways at display size.
      let mediumImage = sharp(buffer)
        .rotate()
        .resize(this.mediumSize, this.mediumSize, {
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

      const [mediumBuffer, thumbnailBuffer] = await Promise.all([
        mediumImage.toBuffer(),
        this.renderThumbnail(buffer, metadata.format, crop),
      ]);

      return {
        medium: mediumBuffer,
        thumbnail: thumbnailBuffer,
        metadata,
        width,
        height,
      };
    } catch (error) {
      // A rejected crop already says exactly what is wrong with it. Do not
      // flatten it into the generic message below.
      if (error instanceof BadRequestException) {
        throw error;
      }

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
  /**
   * Which community may review a characterless upload.
   *
   * Membership is required rather than merely a real id. The value arrives
   * from the client -- the API is one host for every community, so there is no
   * `Host` header to read it off -- and without a check anyone could file
   * their uploads into a community they have nothing to do with, which is a
   * way to put pictures in front of moderators who never agreed to look at
   * them.
   *
   * A community that has gone missing, or one the uploader has since left, is
   * not an error: the upload falls back to the global queue rather than
   * failing. Refusing it would mean an upload that dies because of a
   * membership change between opening the form and submitting it.
   */
  private async resolveReviewingCommunity(
    userId: string,
    communityId?: string,
  ): Promise<string | null> {
    if (!communityId) return null;

    const membership = await this.db.communityMember.findFirst({
      where: { userId, role: { communityId } },
      select: { id: true },
    });

    if (membership) return communityId;

    // Global admins are in no community and moderate everywhere, so their own
    // uploads would otherwise never carry one.
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) return null;

    const community = await this.db.community.findUnique({
      where: { id: communityId },
      select: { id: true },
    });

    return community?.id ?? null;
  }

  private async verifyCharacterEditPermission(
    userId: string,
    characterId: string,
  ): Promise<void> {
    // Global admins bypass all permission checks
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (user?.isAdmin) return;

    // Fetch character with species info
    const character = await this.db.character.findFirst({
      where: { id: characterId, ...notDeleted },
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
      `[cleanupOrphanedImage] URLs - original: ${image.originalUrl}, medium: ${image.mediumUrl}, thumbnail: ${image.thumbnailUrl}`,
    );

    // Delete from S3 (skip base64 images)
    if (image.originalUrl && !image.originalUrl.startsWith("data:")) {
      try {
        // Every variant the row knows about. `mediumUrl` used to be missing
        // from this list, which orphaned one object per deleted image; a
        // re-cropped thumbnail lands on a versioned key, so the row is the
        // only record of which object is current and dropping one here leaks
        // it permanently.
        const urlsToDelete = [
          image.originalUrl,
          image.mediumUrl,
          image.thumbnailUrl,
        ].filter((url): url is string => Boolean(url));

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
