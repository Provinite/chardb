import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { TagsService } from "../tags/tags.service";
import type { Prisma, Visibility, TextFormatting } from "@chardb/database";
import * as path from "path";

/**
 * Service layer input types for media operations.
 * These interfaces provide clean, simple inputs for the service layer,
 * avoiding the complexity of GraphQL relation objects.
 */

/**
 * Enum for filtering media by type (service layer equivalent)
 */
export enum MediaTypeFilter {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT'
}

/**
 * Input data for filtering and paginating media queries
 */
export interface MediaFiltersServiceInput {
  /** Search term to filter by title and description */
  search?: string;
  /** Filter by media type (image or text) */
  mediaType?: MediaTypeFilter;
  /** Filter by visibility level */
  visibility?: Visibility;
  /** Filter by owner user ID */
  ownerId?: string;
  /** Filter by associated character ID */
  characterId?: string;
  /** Filter by associated gallery ID */
  galleryId?: string;
  /** Number of items to return */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

/**
 * Input data for creating text media
 */
export interface CreateTextMediaServiceInput {
  /** Title of the text media */
  title: string;
  /** Optional description */
  description?: string;
  /** The text content */
  content: string;
  /** Text formatting type */
  formatting?: TextFormatting;
  /** Visibility level */
  visibility?: Visibility;
  /** Associated character ID */
  characterId?: string;
  /** Associated gallery ID */
  galleryId?: string;
  /** Tags to associate with this media */
  tags?: string[];
}

/**
 * Input data for updating media
 */
export interface UpdateMediaServiceInput {
  /** Updated title */
  title?: string;
  /** Updated description */
  description?: string;
  /** Updated visibility */
  visibility?: Visibility;
  /** Updated character association */
  characterId?: string;
  /** Updated gallery association */
  galleryId?: string;
  /** Updated tags */
  tags?: string[];
}

/**
 * Input data for updating text content
 */
export interface UpdateTextContentServiceInput {
  /** Updated text content */
  content?: string;
  /** Updated formatting */
  formatting?: TextFormatting;
}

/**
 * Service for managing polymorphic media (images and text content)
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  
  constructor(
    private readonly db: DatabaseService,
    private readonly tagsService: TagsService,
  ) {}

  /**
   * Calculates word count for text content
   * @param text The text to count words for
   * @returns Number of words in the text
   */
  private calculateWordCount(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Retrieves paginated media with proper visibility filtering
   * @param filters Optional filtering and pagination parameters
   * @param userId Current user ID for visibility checks
   * @returns Paginated media results
   */
  async findAll(filters: MediaFiltersServiceInput = {}, userId?: string) {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const where: Prisma.MediaWhereInput = {
      AND: [
        // Visibility filter - properly handle private content
        {
          OR: [
            { visibility: "PUBLIC" },
            { visibility: "UNLISTED" },
            // Private content only visible to owner
            userId
              ? {
                  AND: [{ visibility: "PRIVATE" }, { ownerId: userId }],
                }
              : { id: "never-matches" }, // Exclude private content for anonymous users
          ],
        },

        // Search filter
        filters?.search
          ? {
              OR: [
                { title: { contains: filters.search, mode: "insensitive" } },
                {
                  description: {
                    contains: filters.search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {},

        // Type-specific filters (using new nullable FK structure)
        filters?.mediaType === MediaTypeFilter.IMAGE ? { imageId: { not: null } } : {},
        filters?.mediaType === MediaTypeFilter.TEXT ? { textContentId: { not: null } } : {},
        filters?.ownerId ? { ownerId: filters.ownerId } : {},
        filters?.characterId ? { characterId: filters.characterId } : {},
        filters?.galleryId ? { galleryId: filters.galleryId } : {},
        filters?.visibility ? { visibility: filters.visibility } : {},
      ],
    };

    const [media, total] = await Promise.all([
      this.db.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.media.count({ where }),
    ]);

    return {
      media,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Retrieves a single media item by ID
   * @param id Media ID to retrieve
   * @param userId Current user ID for visibility checks
   * @returns Media item
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user lacks access to private media
   */
  async findOne(id: string, userId?: string) {
    this.logger.debug(`Finding media with id: ${id}, userId: ${userId || 'anonymous'}`);
    
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    // Check visibility permissions
    if (media.visibility === "PRIVATE" && media.ownerId !== userId) {
      throw new ForbiddenException(
        "You do not have permission to view this media",
      );
    }

    return media;
  }

  /**
   * Creates a new text media item with automatic word count calculation
   * @param userId ID of the user creating the media
   * @param input Text media creation parameters
   * @returns Newly created media item with text content
   * @throws ForbiddenException if user tries to assign media to character they don't own
   */
  async createTextMedia(userId: string, input: CreateTextMediaServiceInput) {
    const wordCount = this.calculateWordCount(input.content);

    return this.db.$transaction(async (tx) => {
      // Create text content
      const textContent = await tx.textContent.create({
        data: {
          content: input.content,
          wordCount,
          formatting: input.formatting,
        },
      });

      // Create media record with nullable FK approach
      const media = await tx.media.create({
        data: {
          title: input.title,
          description: input.description,
          ownerId: userId,
          characterId: input.characterId,
          galleryId: input.galleryId,
          visibility: input.visibility,
          // Use nullable FK instead of discriminator
          textContentId: textContent.id,
          imageId: null, // Explicitly null for text media
        },
      });

      return media;
    });
  }

  /**
   * Updates media metadata (title, description, visibility, etc.)
   * @param id Media ID to update
   * @param userId ID of the user performing the update
   * @param input Updated media parameters
   * @returns Updated media item
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async updateMedia(id: string, userId: string, input: UpdateMediaServiceInput) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only update your own media");
    }

    return this.db.media.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        characterId: input.characterId,
        galleryId: input.galleryId,
        visibility: input.visibility,
      },
    });

  }



  /**
   * Updates the text content of a text media item
   * @param mediaId ID of the media containing the text content
   * @param userId ID of the user performing the update
   * @param input Updated text content parameters
   * @returns Updated media item with new text content
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async updateTextContent(
    mediaId: string,
    userId: string,
    input: UpdateTextContentServiceInput,
  ) {
    const media = await this.db.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only update your own media");
    }

    if (media.textContentId === null) {
      throw new ForbiddenException("This media is not text content");
    }

    const updateData: Prisma.TextContentUpdateInput = {};
    if (input.content !== undefined) {
      updateData.content = input.content;
      updateData.wordCount = this.calculateWordCount(input.content);
    }
    if (input.formatting !== undefined) {
      updateData.formatting = input.formatting;
    }

    await this.db.textContent.update({
      where: { id: media.textContentId },
      data: updateData,
    });

    return this.db.media.findUnique({
      where: { id: mediaId },
    });
  }

  /**
   * Deletes a media item and its associated content
   * @param id Media ID to delete
   * @param userId ID of the user performing the deletion
   * @returns Promise resolving to true if deletion was successful
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async remove(id: string, userId: string) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only delete your own media");
    }

    // Handle image file cleanup if this media contains an image
    if (media.imageId) {
      const image = await this.db.image.findUnique({
        where: { id: media.imageId },
      });
      if (image) {
        await this.cleanupImageFiles(image);
      }
    }

    // Delete the media record - CASCADE constraints will handle content deletion
    await this.db.media.delete({
      where: { id },
    });

    return true;
  }

  /**
   * Cleans up image files (handles both S3 and local storage)
   * @param image Image record containing file information
   */
  private async cleanupImageFiles(image: Prisma.ImageGetPayload<{}>) {
    try {
      // Check if we're using S3 (URL contains amazonaws.com or other S3 indicators)
      if (image.url && (image.url.includes('amazonaws.com') || image.url.includes('s3'))) {
        await this.deleteFromS3(image.url, image.thumbnailUrl);
      } else if (image.url && image.url.startsWith('data:')) {
        // Base64 encoded image - no file cleanup needed, stored in DB
        this.logger.debug('Base64 image detected, no file cleanup needed');
      } else if (image.url && (image.url.startsWith('/') || image.url.includes('localhost'))) {
        // Local file storage
        await this.deleteLocalFiles(image.url, image.thumbnailUrl);
      }
    } catch (error) {
      // Log the error but don't fail the deletion
      this.logger.error(`Failed to cleanup image files for image ${image.id}:`, error);
    }
  }

  /**
   * Deletes files from S3
   * @param imageUrl Main image URL
   * @param thumbnailUrl Optional thumbnail URL
   */
  private async deleteFromS3(imageUrl: string, thumbnailUrl?: string) {
    // TODO: Implement S3 deletion using AWS SDK
    // This would require:
    // 1. Parse the S3 key from the URL
    // 2. Use AWS S3 client to delete the object(s)
    // 3. Handle both main image and thumbnail
    
    this.logger.warn('S3 file cleanup not implemented yet');
    
    // Example implementation:
    // const s3Key = this.extractS3KeyFromUrl(imageUrl);
    // await this.s3Client.deleteObject({ Bucket: this.bucketName, Key: s3Key }).promise();
    // if (thumbnailUrl) {
    //   const thumbnailKey = this.extractS3KeyFromUrl(thumbnailUrl);
    //   await this.s3Client.deleteObject({ Bucket: this.bucketName, Key: thumbnailKey }).promise();
    // }
  }

  /**
   * Deletes local files from filesystem
   * @param imageUrl Main image path
   * @param thumbnailUrl Optional thumbnail path
   */
  private async deleteLocalFiles(imageUrl: string, thumbnailUrl?: string) {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      // Convert URL to local file path
      const imagePath = this.urlToLocalPath(imageUrl);
      await fs.unlink(imagePath);
      this.logger.debug(`Deleted local image file: ${imagePath}`);

      if (thumbnailUrl) {
        const thumbnailPath = this.urlToLocalPath(thumbnailUrl);
        await fs.unlink(thumbnailPath);
        this.logger.debug(`Deleted local thumbnail file: ${thumbnailPath}`);
      }
    } catch (error) {
      this.logger.error('Failed to delete local files:', error);
    }
  }

  /**
   * Converts a URL to a local file system path
   * @param url The URL to convert
   * @returns Local file system path
   */
  private urlToLocalPath(url: string): string {
    // Handle relative URLs like '/uploads/image.jpg'
    if (url.startsWith('/')) {
      return path.join(process.cwd(), 'uploads', url.substring(1));
    }
    
    // Handle localhost URLs
    if (url.includes('localhost')) {
      const urlPath = new URL(url).pathname;
      return path.join(process.cwd(), 'uploads', urlPath.substring(1));
    }
    
    return url;
  }

  /**
   * Adds tags to a media item
   * @param id Media ID to add tags to
   * @param userId ID of the user adding tags
   * @param tagNames Array of tag names to add
   * @returns Updated media item with new tags
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async addTags(id: string, userId: string, tagNames: string[]) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only tag your own media");
    }

    // Get or create tags
    const tags = await this.tagsService.findOrCreateTags(tagNames);

    // Create tag relations
    await Promise.all(
      tags.map((tag) =>
        this.db.mediaTag.upsert({
          where: {
            mediaId_tagId: {
              mediaId: id,
              tagId: tag.id,
            },
          },
          update: {},
          create: {
            mediaId: id,
            tagId: tag.id,
          },
        }),
      ),
    );

    return this.findOne(id, userId);
  }

  /**
   * Removes tags from a media item
   * @param id Media ID to remove tags from
   * @param userId ID of the user removing tags
   * @param tagNames Array of tag names to remove
   * @returns Updated media item without the removed tags
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async removeTags(id: string, userId: string, tagNames: string[]) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException(
        "You can only remove tags from your own media",
      );
    }

    // Find tags by name
    const tags = await this.db.tag.findMany({
      where: { name: { in: tagNames } },
    });

    // Remove tag relations
    await this.db.mediaTag.deleteMany({
      where: {
        mediaId: id,
        tagId: { in: tags.map((tag) => tag.id) },
      },
    });

    return this.findOne(id, userId);
  }

  /**
   * Retrieves text content by ID
   * @param textContentId Text content ID to retrieve
   * @returns Text content record
   * @throws NotFoundException if text content doesn't exist
   */
  async findTextContent(textContentId: string) {
    const textContent = await this.db.textContent.findUnique({
      where: { id: textContentId },
    });

    if (!textContent) {
      throw new NotFoundException("Text content not found");
    }

    return textContent;
  }

  /**
   * Retrieves media tag relationships for a media item
   * @param mediaId Media ID to get tags for
   * @returns Array of media tag relationships with tag information
   */
  async findMediaTags(mediaId: string) {
    return this.db.mediaTag.findMany({
      where: { mediaId },
      include: {
        tag: true,
      },
    });
  }
}
