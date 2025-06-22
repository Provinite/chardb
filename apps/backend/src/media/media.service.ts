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
        // Visibility filter
        userId ? {} : { visibility: 'PUBLIC' },
        
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
          character: true,
          gallery: true,
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

    // Add content based on media type and user interaction data
    const enrichedMedia = await Promise.all(
      media.map(async (item) => {
        let content = null;
        
        if (item.mediaType === 'IMAGE') {
          content = await this.db.image.findUnique({
            where: { id: item.contentId }
          });
        } else if (item.mediaType === 'TEXT') {
          content = await this.db.textContent.findUnique({
            where: { id: item.contentId }
          });
        }

        // Check if user has liked this media
        const userHasLiked = userId ? await this.db.like.findFirst({
          where: { userId, mediaId: item.id }
        }) !== null : false;

        return {
          ...item,
          image: item.mediaType === 'IMAGE' ? content : null,
          textContent: item.mediaType === 'TEXT' ? content : null,
          likesCount: item._count.likes,
          userHasLiked,
        };
      })
    );

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
        character: true,
        gallery: true,
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

    return {
      ...media,
      image: media.mediaType === 'IMAGE' ? content : null,
      textContent: media.mediaType === 'TEXT' ? content : null,
      likesCount: media._count.likes,
      userHasLiked,
    };
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
          character: true,
          gallery: true,
          tags_rel: {
            include: { tag: true }
          },
        },
      });

      return {
        ...media,
        textContent,
        image: null,
        likesCount: 0,
        userHasLiked: false,
      };
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
        character: true,
        gallery: true,
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

    return {
      ...updatedMedia,
      image: updatedMedia.mediaType === 'IMAGE' ? content : null,
      textContent: updatedMedia.mediaType === 'TEXT' ? content : null,
      likesCount: updatedMedia._count.likes,
      userHasLiked,
    };
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