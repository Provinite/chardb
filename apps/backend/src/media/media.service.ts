import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { Media, TextContent, Prisma } from "@chardb/database";
import {
  MediaFiltersInput,
  CreateTextMediaInput,
  UpdateMediaInput,
  UpdateTextContentInput,
} from "./dto/media.dto";

/**
 * Service for managing polymorphic media (images and text content)
 */
@Injectable()
export class MediaService {
  constructor(private readonly db: DatabaseService) {}

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
   * @returns Paginated media results with enriched data
   */
  async findAll(filters?: MediaFiltersInput, userId?: string) {
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
        filters?.mediaType === "IMAGE" ? { imageId: { not: null } } : {},
        filters?.mediaType === "TEXT" ? { textContentId: { not: null } } : {},
        filters?.ownerId ? { ownerId: filters.ownerId } : {},
        filters?.characterId ? { characterId: filters.characterId } : {},
        filters?.galleryId ? { galleryId: filters.galleryId } : {},
        filters?.visibility ? { visibility: filters.visibility } : {},
      ],
    };

    const [media, total] = await Promise.all([
      this.db.media.findMany({
        where,
        include: {
          owner: true,
          character: {
            include: {
              owner: true,
              _count: {
                select: { likes: true, media: true },
              },
            },
          },
          gallery: {
            include: {
              owner: true,
              images: {
                include: {
                  uploader: true,
                  _count: {
                    select: { likes: true },
                  },
                },
              },
              _count: {
                select: { images: true, likes: true },
              },
            },
          },
          // Direct JOIN to content tables - no more N+1 queries!
          image: true,
          textContent: true,
          tags_rel: {
            include: { tag: true },
          },
          _count: {
            select: { likes: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      this.db.media.count({ where }),
    ]);

    // Simple user likes query (only if user is authenticated)
    const userLikes = userId
      ? await this.db.like.findMany({
          where: {
            userId,
            mediaId: { in: media.map((m) => m.id) },
          },
          select: { mediaId: true },
        })
      : [];

    const likedMediaIds = new Set(userLikes.map((like) => like.mediaId));

    // Clean, simple enrichment - no complex batch logic needed
    const enrichedMedia = media.map((item) => {
      const enrichedItem = {
        ...item,
        owner: {
          ...item.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        character: item.character
          ? {
              ...item.character,
              price: item.character.price ? Number(item.character.price) : null,
              customFields: JSON.stringify(item.character.customFields),
              owner: {
                ...item.character.owner,
                followersCount: 0, // TODO: Implement proper follower counts
                followingCount: 0, // TODO: Implement proper following counts
                userIsFollowing: false, // TODO: Implement proper following status
              },
              _count: {
                media: item.character._count?.media || 0,
                likes: item.character._count?.likes || 0,
              },
              likesCount: item.character._count?.likes || 0,
              userHasLiked: false, // TODO: Implement proper character like status
            }
          : null,
        gallery: item.gallery
          ? {
              ...item.gallery,
              owner: {
                ...item.gallery.owner,
                followersCount: 0, // TODO: Implement proper follower counts
                followingCount: 0, // TODO: Implement proper following counts
                userIsFollowing: false, // TODO: Implement proper following status
              },
              images: item.gallery.images
                ? item.gallery.images.map((img) => ({
                    ...img,
                    uploader: {
                      ...img.uploader,
                      followersCount: 0, // TODO: Implement proper follower counts
                      followingCount: 0, // TODO: Implement proper following counts
                      userIsFollowing: false, // TODO: Implement proper following status
                    },
                    likesCount: img._count?.likes || 0,
                    userHasLiked: false, // TODO: Implement proper image like status
                  }))
                : [],
              _count: {
                images: item.gallery._count?.images || 0,
              },
              likesCount: item.gallery._count?.likes || 0,
              userHasLiked: false, // TODO: Implement proper gallery like status
            }
          : null,
        // Content is now directly available via JOINs!
        likesCount: item._count.likes,
        userHasLiked: likedMediaIds.has(item.id),
      };

      // Fix tags_rel to include media reference
      enrichedItem.tags_rel =
        item.tags_rel?.map((tagRel) => ({
          ...tagRel,
          media: enrichedItem,
        })) || [];

      return enrichedItem;
    });

    return {
      media: enrichedMedia,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Retrieves a single media item by ID with full content inclusion
   * @param id Media ID to retrieve
   * @param userId Current user ID for visibility and like status checks
   * @returns Enriched media item with all related data
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user lacks access to private media
   */
  async findOne(id: string, userId?: string) {
    const media = await this.db.media.findUnique({
      where: { id },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
            _count: {
              select: { likes: true, media: true },
            },
          },
        },
        gallery: {
          include: {
            owner: true,
            images: {
              include: {
                uploader: true,
                _count: {
                  select: { likes: true },
                },
              },
            },
            _count: {
              select: { images: true, likes: true },
            },
          },
        },
        // Direct JOINs - content is immediately available!
        image: true,
        textContent: true,
        tags_rel: {
          include: { tag: true },
        },
        _count: {
          select: { likes: true },
        },
      },
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

    // Check if user has liked this media
    const userHasLiked = userId
      ? (await this.db.like.findFirst({
          where: { userId, mediaId: media.id },
        })) !== null
      : false;

    const enrichedMedia = {
      ...media,
      owner: {
        ...media.owner,
        followersCount: 0, // TODO: Implement proper follower counts
        followingCount: 0, // TODO: Implement proper following counts
        userIsFollowing: false, // TODO: Implement proper following status
      },
      character: media.character
        ? {
            ...media.character,
            price: media.character.price ? Number(media.character.price) : null,
            customFields: JSON.stringify(media.character.customFields),
            owner: {
              ...media.character.owner,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            _count: {
              media: media.character._count?.media || 0,
              likes: media.character._count?.likes || 0,
            },
            likesCount: media.character._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper character like status
          }
        : null,
      gallery: media.gallery
        ? {
            ...media.gallery,
            owner: {
              ...media.gallery.owner,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            images: media.gallery.images
              ? media.gallery.images.map((img) => ({
                  ...img,
                  uploader: {
                    ...img.uploader,
                    followersCount: 0, // TODO: Implement proper follower counts
                    followingCount: 0, // TODO: Implement proper following counts
                    userIsFollowing: false, // TODO: Implement proper following status
                  },
                  likesCount: img._count?.likes || 0,
                  userHasLiked: false, // TODO: Implement proper image like status
                }))
              : [],
            _count: {
              images: media.gallery._count?.images || 0,
            },
            likesCount: media.gallery._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper gallery like status
          }
        : null,
      // Content is directly available via JOINs - no additional queries needed!
      likesCount: media._count.likes,
      userHasLiked,
    };

    // Fix tags_rel to include media reference
    enrichedMedia.tags_rel =
      media.tags_rel?.map((tagRel) => ({
        ...tagRel,
        media: enrichedMedia,
      })) || [];

    return enrichedMedia;
  }

  /**
   * Creates a new text media item with automatic word count calculation
   * @param userId ID of the user creating the media
   * @param input Text media creation parameters
   * @returns Newly created media item with text content
   * @throws ForbiddenException if user tries to assign media to character they don't own
   */
  async createTextMedia(userId: string, input: CreateTextMediaInput) {
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
        include: {
          owner: true,
          character: {
            include: {
              owner: true,
              _count: {
                select: { likes: true, media: true },
              },
            },
          },
          gallery: {
            include: {
              owner: true,
              images: {
                include: {
                  uploader: true,
                  _count: {
                    select: { likes: true },
                  },
                },
              },
              _count: {
                select: { images: true, likes: true },
              },
            },
          },
          // Direct JOIN to get text content
          textContent: true,
          tags_rel: {
            include: { tag: true },
          },
        },
      });

      const enrichedMedia = {
        ...media,
        owner: {
          ...media.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        character: media.character
          ? {
              ...media.character,
              price: media.character.price
                ? Number(media.character.price)
                : null,
              customFields: JSON.stringify(media.character.customFields),
              owner: {
                ...media.character.owner,
                followersCount: 0, // TODO: Implement proper follower counts
                followingCount: 0, // TODO: Implement proper following counts
                userIsFollowing: false, // TODO: Implement proper following status
              },
              _count: {
                media: media.character._count?.media || 0,
                likes: media.character._count?.likes || 0,
              },
              likesCount: media.character._count?.likes || 0,
              userHasLiked: false, // TODO: Implement proper character like status
            }
          : null,
        gallery: media.gallery
          ? {
              ...media.gallery,
              owner: {
                ...media.gallery.owner,
                followersCount: 0, // TODO: Implement proper follower counts
                followingCount: 0, // TODO: Implement proper following counts
                userIsFollowing: false, // TODO: Implement proper following status
              },
              images: media.gallery.images
                ? media.gallery.images.map((img) => ({
                    ...img,
                    uploader: {
                      ...img.uploader,
                      followersCount: 0, // TODO: Implement proper follower counts
                      followingCount: 0, // TODO: Implement proper following counts
                      userIsFollowing: false, // TODO: Implement proper following status
                    },
                    likesCount: img._count?.likes || 0,
                    userHasLiked: false, // TODO: Implement proper image like status
                  }))
                : [],
              _count: {
                images: media.gallery._count?.images || 0,
              },
              likesCount: media.gallery._count?.likes || 0,
              userHasLiked: false, // TODO: Implement proper gallery like status
            }
          : null,
        // textContent and image are directly available via JOINs!
        likesCount: 0,
        userHasLiked: false,
      };

      // Fix tags_rel to include media reference
      enrichedMedia.tags_rel =
        media.tags_rel?.map((tagRel) => ({
          ...tagRel,
          media: enrichedMedia,
        })) || [];

      return enrichedMedia;
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
  async updateMedia(id: string, userId: string, input: UpdateMediaInput) {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only update your own media");
    }

    const updatedMedia = await this.db.media.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        characterId: input.characterId,
        galleryId: input.galleryId,
        visibility: input.visibility,
      },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
            _count: {
              select: { likes: true, media: true },
            },
          },
        },
        gallery: {
          include: {
            owner: true,
            images: {
              include: {
                uploader: true,
                _count: {
                  select: { likes: true },
                },
              },
            },
            _count: {
              select: { images: true, likes: true },
            },
          },
        },
        // Direct JOINs for content
        image: true,
        textContent: true,
        tags_rel: {
          include: { tag: true },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    // Check if user has liked this media
    const userHasLiked =
      (await this.db.like.findFirst({
        where: { userId, mediaId: updatedMedia.id },
      })) !== null;

    const enrichedMedia = {
      ...updatedMedia,
      owner: {
        ...updatedMedia.owner,
        followersCount: 0, // TODO: Implement proper follower counts
        followingCount: 0, // TODO: Implement proper following counts
        userIsFollowing: false, // TODO: Implement proper following status
      },
      character: updatedMedia.character
        ? {
            ...updatedMedia.character,
            price: updatedMedia.character.price
              ? Number(updatedMedia.character.price)
              : null,
            customFields: JSON.stringify(updatedMedia.character.customFields),
            owner: {
              ...updatedMedia.character.owner,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            _count: {
              media: updatedMedia.character._count?.media || 0,
              likes: updatedMedia.character._count?.likes || 0,
            },
            likesCount: updatedMedia.character._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper character like status
          }
        : null,
      gallery: updatedMedia.gallery
        ? {
            ...updatedMedia.gallery,
            owner: {
              ...updatedMedia.gallery.owner,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            images: updatedMedia.gallery.images
              ? updatedMedia.gallery.images.map((img) => ({
                  ...img,
                  uploader: {
                    ...img.uploader,
                    followersCount: 0, // TODO: Implement proper follower counts
                    followingCount: 0, // TODO: Implement proper following counts
                    userIsFollowing: false, // TODO: Implement proper following status
                  },
                  likesCount: img._count?.likes || 0,
                  userHasLiked: false, // TODO: Implement proper image like status
                }))
              : [],
            _count: {
              images: updatedMedia.gallery._count?.images || 0,
            },
            likesCount: updatedMedia.gallery._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper gallery like status
          }
        : null,
      // Content is directly available via JOINs!
      likesCount: updatedMedia._count.likes,
      userHasLiked,
    };

    // Fix tags_rel to include media reference
    enrichedMedia.tags_rel =
      updatedMedia.tags_rel?.map((tagRel) => ({
        ...tagRel,
        media: enrichedMedia,
      })) || [];

    return enrichedMedia;
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
    input: UpdateTextContentInput,
  ) {
    const media = await this.db.media.findUnique({
      where: { id: mediaId },
      include: {
        // Direct JOIN to get text content
        textContent: true,
      },
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

    const updateData: any = {};
    if (input.content !== undefined) {
      updateData.content = input.content;
      updateData.wordCount = this.calculateWordCount(input.content);
    }
    if (input.formatting !== undefined) {
      updateData.formatting = input.formatting;
    }

    const updatedTextContent = await this.db.textContent.update({
      where: { id: media.textContentId },
      data: updateData,
    });

    return this.findOne(mediaId, userId);
  }

  /**
   * Deletes a media item and its associated content
   * @param id Media ID to delete
   * @param userId ID of the user performing the deletion
   * @returns Promise resolving to true if deletion was successful
   * @throws NotFoundException if media doesn't exist
   * @throws ForbiddenException if user doesn't own the media
   */
  async remove(id: string, userId: string): Promise<boolean> {
    const media = await this.db.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException("You can only delete your own media");
    }

    // Delete the media record - CASCADE constraints will handle content deletion
    await this.db.media.delete({
      where: { id },
    });

    return true;
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
    const tags = await Promise.all(
      tagNames.map((name) =>
        this.db.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        }),
      ),
    );

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
}
