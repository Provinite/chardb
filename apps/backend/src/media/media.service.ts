import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { Media, TextContent, MediaType, Prisma } from '@chardb/database';
import { 
  MediaFiltersInput, 
  CreateTextMediaInput, 
  UpdateMediaInput, 
  UpdateTextContentInput 
} from './dto/media.dto';

@Injectable()
export class MediaService {
  constructor(private readonly db: DatabaseService) {}

  private calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  async findAll(filters?: MediaFiltersInput, userId?: string) {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const where: Prisma.MediaWhereInput = {
      AND: [
        // Visibility filter - properly handle private content
        {
          OR: [
            { visibility: 'PUBLIC' },
            { visibility: 'UNLISTED' },
            // Private content only visible to owner
            userId ? { 
              AND: [
                { visibility: 'PRIVATE' },
                { ownerId: userId }
              ]
            } : { id: 'never-matches' } // Exclude private content for anonymous users
          ]
        },
        
        // Search filter
        filters?.search ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ]
        } : {},

        // Type-specific filters
        filters?.mediaType ? { mediaType: filters.mediaType } : {},
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
                select: { likes: true, images: true }
              }
            }
          },
          gallery: {
            include: {
              owner: true,
              images: {
                include: {
                  uploader: true,
                  _count: {
                    select: { likes: true }
                  }
                }
              },
              _count: {
                select: { images: true, likes: true }
              }
            }
          },
          tags_rel: {
            include: { tag: true }
          },
          _count: {
            select: { likes: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.media.count({ where }),
    ]);

    // Batch fetch content and likes to avoid N+1 queries
    const mediaIds = media.map(m => m.id);
    const imageContentIds = media.filter(m => m.mediaType === 'IMAGE').map(m => m.contentId);
    const textContentIds = media.filter(m => m.mediaType === 'TEXT').map(m => m.contentId);

    // Batch fetch all content in parallel
    const [imageContents, textContents, userLikes] = await Promise.all([
      imageContentIds.length > 0 
        ? this.db.image.findMany({
            where: { id: { in: imageContentIds } }
          })
        : [],
      textContentIds.length > 0
        ? this.db.textContent.findMany({
            where: { id: { in: textContentIds } }
          })
        : [],
      userId && mediaIds.length > 0
        ? this.db.like.findMany({
            where: { 
              userId,
              mediaId: { in: mediaIds }
            },
            select: { mediaId: true }
          })
        : []
    ]);

    // Create lookup maps for O(1) access
    const imageContentMap = new Map(imageContents.map(img => [img.id, img] as const));
    const textContentMap = new Map(textContents.map(text => [text.id, text] as const));
    const likedMediaIds = new Set(userLikes.map(like => like.mediaId));

    // Enrich media with content and like status
    const enrichedMedia = media.map(item => {
      const image = item.mediaType === 'IMAGE' ? imageContentMap.get(item.contentId) : null;
      const textContent = item.mediaType === 'TEXT' ? textContentMap.get(item.contentId) : null;
      const userHasLiked = likedMediaIds.has(item.id);

      const enrichedItem = {
        ...item,
        owner: {
          ...item.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        character: item.character ? {
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
            images: item.character._count?.images || 0,
            likes: item.character._count?.likes || 0,
          },
          likesCount: item.character._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper character like status
        } : null,
        gallery: item.gallery ? {
          ...item.gallery,
          owner: {
            ...item.gallery.owner,
            followersCount: 0, // TODO: Implement proper follower counts
            followingCount: 0, // TODO: Implement proper following counts
            userIsFollowing: false, // TODO: Implement proper following status
          },
          images: item.gallery.images ? item.gallery.images.map(img => ({
            ...img,
            uploader: {
              ...img.uploader,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            likesCount: img._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper image like status
          })) : [],
          _count: {
            images: item.gallery._count?.images || 0,
          },
          likesCount: item.gallery._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper gallery like status
        } : null,
        image,
        textContent,
        likesCount: item._count.likes,
        userHasLiked,
      };

      // Fix tags_rel to include media reference
      // @ts-ignore - Circular reference issue with Media type
      enrichedItem.tags_rel = item.tags_rel?.map(tagRel => ({
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

  async findOne(id: string, userId?: string) {
    const media = await this.db.media.findUnique({
      where: { id },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
            _count: {
              select: { likes: true, images: true }
            }
          }
        },
        gallery: {
          include: {
            owner: true,
            images: {
              include: {
                uploader: true,
                _count: {
                  select: { likes: true }
                }
              }
            },
            _count: {
              select: { images: true, likes: true }
            }
          }
        },
        tags_rel: {
          include: { tag: true }
        },
        _count: {
          select: { likes: true }
        }
      },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Check visibility permissions
    if (media.visibility === 'PRIVATE' && media.ownerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this media');
    }

    // Get content based on media type
    let content = null;
    if (media.mediaType === 'IMAGE') {
      content = await this.db.image.findUnique({
        where: { id: media.contentId }
      });
    } else if (media.mediaType === 'TEXT') {
      content = await this.db.textContent.findUnique({
        where: { id: media.contentId }
      });
    }

    // Check if user has liked this media
    const userHasLiked = userId ? await this.db.like.findFirst({
      where: { userId, mediaId: media.id }
    }) !== null : false;

    const enrichedMedia = {
      ...media,
      owner: {
        ...media.owner,
        followersCount: 0, // TODO: Implement proper follower counts
        followingCount: 0, // TODO: Implement proper following counts
        userIsFollowing: false, // TODO: Implement proper following status
      },
      character: media.character ? {
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
          images: media.character._count?.images || 0,
          likes: media.character._count?.likes || 0,
        },
        likesCount: media.character._count?.likes || 0,
        userHasLiked: false, // TODO: Implement proper character like status
      } : null,
      gallery: media.gallery ? {
        ...media.gallery,
        owner: {
          ...media.gallery.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        images: media.gallery.images ? media.gallery.images.map(img => ({
          ...img,
          uploader: {
            ...img.uploader,
            followersCount: 0, // TODO: Implement proper follower counts
            followingCount: 0, // TODO: Implement proper following counts
            userIsFollowing: false, // TODO: Implement proper following status
          },
          likesCount: img._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper image like status
        })) : [],
        _count: {
          images: media.gallery._count?.images || 0,
        },
        likesCount: media.gallery._count?.likes || 0,
        userHasLiked: false, // TODO: Implement proper gallery like status
      } : null,
      image: media.mediaType === 'IMAGE' ? content : null,
      textContent: media.mediaType === 'TEXT' ? content : null,
      likesCount: media._count.likes,
      userHasLiked,
    };

    // Fix tags_rel to include media reference
    // @ts-ignore - Circular reference issue with Media type
    enrichedMedia.tags_rel = media.tags_rel?.map(tagRel => ({
      ...tagRel,
      media: enrichedMedia,
    })) || [];

    return enrichedMedia;
  }

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

      // Create media record
      const media = await tx.media.create({
        data: {
          title: input.title,
          description: input.description,
          ownerId: userId,
          characterId: input.characterId,
          galleryId: input.galleryId,
          visibility: input.visibility,
          mediaType: 'TEXT',
          contentId: textContent.id,
        },
        include: {
          owner: true,
          character: {
            include: {
              owner: true,
              _count: {
                select: { likes: true, images: true }
              }
            }
          },
          gallery: {
            include: {
              owner: true,
              images: {
                include: {
                  uploader: true,
                  _count: {
                    select: { likes: true }
                  }
                }
              },
              _count: {
                select: { images: true, likes: true }
              }
            }
          },
          tags_rel: {
            include: { tag: true }
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
        character: media.character ? {
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
            images: media.character._count?.images || 0,
            likes: media.character._count?.likes || 0,
          },
          likesCount: media.character._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper character like status
        } : null,
        gallery: media.gallery ? {
          ...media.gallery,
          owner: {
            ...media.gallery.owner,
            followersCount: 0, // TODO: Implement proper follower counts
            followingCount: 0, // TODO: Implement proper following counts
            userIsFollowing: false, // TODO: Implement proper following status
          },
          images: media.gallery.images ? media.gallery.images.map(img => ({
            ...img,
            uploader: {
              ...img.uploader,
              followersCount: 0, // TODO: Implement proper follower counts
              followingCount: 0, // TODO: Implement proper following counts
              userIsFollowing: false, // TODO: Implement proper following status
            },
            likesCount: img._count?.likes || 0,
            userHasLiked: false, // TODO: Implement proper image like status
          })) : [],
          _count: {
            images: media.gallery._count?.images || 0,
          },
          likesCount: media.gallery._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper gallery like status
        } : null,
        textContent,
        image: null,
        likesCount: 0,
        userHasLiked: false,
      };

      // Fix tags_rel to include media reference
      // @ts-ignore - Circular reference issue with Media type
      enrichedMedia.tags_rel = media.tags_rel?.map(tagRel => ({
        ...tagRel,
        media: enrichedMedia,
      })) || [];

      return enrichedMedia;
    });
  }

  async updateMedia(id: string, userId: string, input: UpdateMediaInput) {
    const media = await this.db.media.findUnique({
      where: { id }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own media');
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
              select: { likes: true, images: true }
            }
          }
        },
        gallery: {
          include: {
            owner: true,
            images: {
              include: {
                uploader: true,
                _count: {
                  select: { likes: true }
                }
              }
            },
            _count: {
              select: { images: true, likes: true }
            }
          }
        },
        tags_rel: {
          include: { tag: true }
        },
        _count: {
          select: { likes: true }
        }
      },
    });

    // Get content
    let content = null;
    if (updatedMedia.mediaType === 'IMAGE') {
      content = await this.db.image.findUnique({
        where: { id: updatedMedia.contentId }
      });
    } else if (updatedMedia.mediaType === 'TEXT') {
      content = await this.db.textContent.findUnique({
        where: { id: updatedMedia.contentId }
      });
    }

    const userHasLiked = await this.db.like.findFirst({
      where: { userId, mediaId: updatedMedia.id }
    }) !== null;

    const enrichedMedia = {
      ...updatedMedia,
      owner: {
        ...updatedMedia.owner,
        followersCount: 0, // TODO: Implement proper follower counts
        followingCount: 0, // TODO: Implement proper following counts
        userIsFollowing: false, // TODO: Implement proper following status
      },
      character: updatedMedia.character ? {
        ...updatedMedia.character,
        price: updatedMedia.character.price ? Number(updatedMedia.character.price) : null,
        customFields: JSON.stringify(updatedMedia.character.customFields),
        owner: {
          ...updatedMedia.character.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        _count: {
          images: updatedMedia.character._count?.images || 0,
          likes: updatedMedia.character._count?.likes || 0,
        },
        likesCount: updatedMedia.character._count?.likes || 0,
        userHasLiked: false, // TODO: Implement proper character like status
      } : null,
      gallery: updatedMedia.gallery ? {
        ...updatedMedia.gallery,
        owner: {
          ...updatedMedia.gallery.owner,
          followersCount: 0, // TODO: Implement proper follower counts
          followingCount: 0, // TODO: Implement proper following counts
          userIsFollowing: false, // TODO: Implement proper following status
        },
        images: updatedMedia.gallery.images ? updatedMedia.gallery.images.map(img => ({
          ...img,
          uploader: {
            ...img.uploader,
            followersCount: 0, // TODO: Implement proper follower counts
            followingCount: 0, // TODO: Implement proper following counts
            userIsFollowing: false, // TODO: Implement proper following status
          },
          likesCount: img._count?.likes || 0,
          userHasLiked: false, // TODO: Implement proper image like status
        })) : [],
        _count: {
          images: updatedMedia.gallery._count?.images || 0,
        },
        likesCount: updatedMedia.gallery._count?.likes || 0,
        userHasLiked: false, // TODO: Implement proper gallery like status
      } : null,
      image: updatedMedia.mediaType === 'IMAGE' ? content : null,
      textContent: updatedMedia.mediaType === 'TEXT' ? content : null,
      likesCount: updatedMedia._count.likes,
      userHasLiked,
    };

    // Fix tags_rel to include media reference
    // @ts-ignore - Circular reference issue with Media type
    enrichedMedia.tags_rel = updatedMedia.tags_rel?.map(tagRel => ({
      ...tagRel,
      media: enrichedMedia,
    })) || [];

    return enrichedMedia;
  }

  async updateTextContent(mediaId: string, userId: string, input: UpdateTextContentInput) {
    const media = await this.db.media.findUnique({
      where: { id: mediaId }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('You can only update your own media');
    }

    if (media.mediaType !== 'TEXT') {
      throw new ForbiddenException('This media is not text content');
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
      where: { id: media.contentId },
      data: updateData,
    });

    return this.findOne(mediaId, userId);
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const media = await this.db.media.findUnique({
      where: { id }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own media');
    }

    await this.db.$transaction(async (tx) => {
      // Delete the media record (this will cascade to comments, likes, tags)
      await tx.media.delete({
        where: { id }
      });

      // Delete the content if it's text (images are handled by image service)
      if (media.mediaType === 'TEXT') {
        await tx.textContent.delete({
          where: { id: media.contentId }
        });
      }
    });

    return true;
  }

  async addTags(id: string, userId: string, tagNames: string[]) {
    const media = await this.db.media.findUnique({
      where: { id }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('You can only tag your own media');
    }

    // Get or create tags
    const tags = await Promise.all(
      tagNames.map(name => 
        this.db.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    // Create tag relations
    await Promise.all(
      tags.map(tag =>
        this.db.mediaTag.upsert({
          where: {
            mediaId_tagId: {
              mediaId: id,
              tagId: tag.id,
            }
          },
          update: {},
          create: {
            mediaId: id,
            tagId: tag.id,
          },
        })
      )
    );

    return this.findOne(id, userId);
  }

  async removeTags(id: string, userId: string, tagNames: string[]) {
    const media = await this.db.media.findUnique({
      where: { id }
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    if (media.ownerId !== userId) {
      throw new ForbiddenException('You can only remove tags from your own media');
    }

    // Find tags by name
    const tags = await this.db.tag.findMany({
      where: { name: { in: tagNames } }
    });

    // Remove tag relations
    await this.db.mediaTag.deleteMany({
      where: {
        mediaId: id,
        tagId: { in: tags.map(tag => tag.id) }
      }
    });

    return this.findOne(id, userId);
  }
}