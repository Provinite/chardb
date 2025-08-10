import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, Visibility } from '@chardb/database';
import type { Gallery as PrismaGallery } from '@chardb/database';
import type { Gallery } from './entities/gallery.entity';

export interface CreateGalleryInput {
  name: string;
  description?: string;
  characterId?: string;
  visibility?: Visibility;
  sortOrder?: number;
}

export interface UpdateGalleryInput {
  name?: string;
  description?: string;
  characterId?: string;
  visibility?: Visibility;
  sortOrder?: number;
}

export interface GalleryFilters {
  limit?: number;
  offset?: number;
  ownerId?: string;
  characterId?: string;
  visibility?: Visibility;
}

@Injectable()
export class GalleriesService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, input: CreateGalleryInput): Promise<Gallery> {
    const { name, description, characterId, visibility = Visibility.PUBLIC, sortOrder = 0 } = input;

    // Verify character ownership if specified
    if (characterId) {
      await this.verifyCharacterOwnership(characterId, userId);
    }

    const gallery = await this.db.gallery.create({
      data: {
        name,
        description,
        ownerId: userId,
        characterId,
        visibility,
        sortOrder,
      },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
          },
        },
        _count: {
          select: { media: true, likes: true },
        },
      },
    });

    return {
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        customFields: JSON.stringify(gallery.character.customFields),
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: gallery._count?.likes || 0,
      userHasLiked: false, // Newly created gallery cannot be liked yet
    };
  }

  async findAll(filters: GalleryFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      ownerId,
      characterId,
      visibility,
    } = filters;

    const where: Prisma.GalleryWhereInput = {
      AND: [
        // Visibility filter
        userId 
          ? {
              OR: [
                { visibility: Visibility.PUBLIC },
                { ownerId: userId }, // User can see their own galleries
                { visibility: Visibility.UNLISTED },
              ],
            }
          : { visibility: Visibility.PUBLIC },
        
        // Other filters
        ownerId ? { ownerId } : {},
        characterId ? { characterId } : {},
        visibility !== undefined ? { visibility } : {},
      ],
    };

    const [galleries, total] = await Promise.all([
      this.db.gallery.findMany({
        where,
        include: {
          owner: true,
          character: {
          include: {
            owner: true,
          },
        },
          _count: {
            select: { media: true, likes: true },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      this.db.gallery.count({ where }),
    ]);

    // Check user likes for galleries if user is provided
    const userLikes = userId
      ? await this.db.like.findMany({
          where: {
            userId,
            galleryId: { in: galleries.map((g) => g.id) },
          },
          select: { galleryId: true },
        })
      : [];

    const likedGalleryIds = new Set(userLikes.map((like) => like.galleryId));

    // Enrich galleries with social data
    const enrichedGalleries = galleries.map((gallery) => ({
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        customFields: JSON.stringify(gallery.character.customFields),
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: gallery._count?.likes || 0,
      userHasLiked: likedGalleryIds.has(gallery.id),
    }));

    return {
      galleries: enrichedGalleries,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string): Promise<Gallery> {
    const gallery = await this.db.gallery.findUnique({
      where: { id },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
          },
        },
        _count: {
          select: { media: true, likes: true },
        },
        // NOTE: Gallery media now accessed through Media system
      },
    });

    if (!gallery) {
      throw new NotFoundException('Gallery not found');
    }

    // Check visibility permissions
    if (gallery.visibility === Visibility.PRIVATE) {
      if (!userId || gallery.ownerId !== userId) {
        throw new ForbiddenException('Gallery is private');
      }
    }

    // Check if user has liked this gallery
    const userHasLiked = userId
      ? (await this.db.like.findFirst({
          where: { userId, galleryId: gallery.id },
        })) !== null
      : false;

    return {
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        customFields: JSON.stringify(gallery.character.customFields),
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: gallery._count?.likes || 0,
      userHasLiked,
    };
  }

  async update(id: string, userId: string, input: UpdateGalleryInput): Promise<Gallery> {
    const gallery = await this.findOne(id, userId);

    // Check ownership
    if (gallery.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own galleries');
    }

    // Verify new character ownership if changing
    if (input.characterId && input.characterId !== gallery.characterId) {
      await this.verifyCharacterOwnership(input.characterId, userId);
    }

    const updatedGallery = await this.db.gallery.update({
      where: { id },
      data: input,
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
          },
        },
        _count: {
          select: { media: true, likes: true },
        },
      },
    });

    // Check if user has liked this gallery
    const userHasLiked = (await this.db.like.findFirst({
      where: { userId, galleryId: updatedGallery.id },
    })) !== null;

    return {
      ...updatedGallery,
      owner: {
        ...updatedGallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: updatedGallery.character ? {
        ...updatedGallery.character,
        price: updatedGallery.character.price ? Number(updatedGallery.character.price) : null,
        customFields: JSON.stringify(updatedGallery.character.customFields),
        owner: {
          ...updatedGallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: updatedGallery._count?.likes || 0,
      userHasLiked,
    };
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const gallery = await this.findOne(id, userId);

    // Check ownership
    if (gallery.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own galleries');
    }

    await this.db.gallery.delete({
      where: { id },
    });

    return true;
  }

  // NOTE: Image-gallery association now handled through Media system
  // These methods are deprecated and should be replaced with media-based operations


  async reorderGalleries(userId: string, galleryIds: string[]): Promise<Gallery[]> {
    // Verify all galleries belong to the user
    const userGalleries = await this.db.gallery.findMany({
      where: {
        id: { in: galleryIds },
        ownerId: userId,
      },
    });

    if (userGalleries.length !== galleryIds.length) {
      throw new ForbiddenException('Some galleries do not belong to you');
    }

    // Update sort orders
    const updatePromises = galleryIds.map((id, index) =>
      this.db.gallery.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updatePromises);

    // Return updated galleries with enrichment
    const updatedGalleries = await this.db.gallery.findMany({
      where: {
        id: { in: galleryIds },
      },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
          },
        },
        _count: {
          select: { media: true, likes: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Check user likes
    const userLikes = await this.db.like.findMany({
      where: {
        userId,
        galleryId: { in: updatedGalleries.map((g) => g.id) },
      },
      select: { galleryId: true },
    });

    const likedGalleryIds = new Set(userLikes.map((like) => like.galleryId));

    return updatedGalleries.map((gallery) => ({
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        customFields: JSON.stringify(gallery.character.customFields),
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: gallery._count?.likes || 0,
      userHasLiked: likedGalleryIds.has(gallery.id),
    }));
  }

  async findLikedGalleries(userId: string): Promise<Gallery[]> {
    // Get galleries liked by the user
    const likedGalleries = await this.db.gallery.findMany({
      where: {
        likes: {
          some: { userId },
        },
        // Only include galleries that are visible to the user
        OR: [
          { visibility: Visibility.PUBLIC },
          { visibility: Visibility.UNLISTED },
          { ownerId: userId }, // User can see their own private galleries
        ],
      },
      include: {
        owner: true,
        character: {
          include: {
            owner: true,
          },
        },
        _count: {
          select: { media: true, likes: true },
        },
      },
      orderBy: [
        { createdAt: 'desc' }, // Most recently created first
      ],
    });

    // All these galleries are liked by the user by definition
    return likedGalleries.map((gallery) => ({
      ...gallery,
      owner: {
        ...gallery.owner,
        followersCount: 0,
        followingCount: 0,
        userIsFollowing: false,
      },
      character: gallery.character ? {
        ...gallery.character,
        price: gallery.character.price ? Number(gallery.character.price) : null,
        customFields: JSON.stringify(gallery.character.customFields),
        owner: {
          ...gallery.character.owner,
          followersCount: 0,
          followingCount: 0,
          userIsFollowing: false,
        },
        likesCount: 0,
        userHasLiked: false,
      } : null,
      likesCount: gallery._count?.likes || 0,
      userHasLiked: true,
    }));
  }

  private async verifyCharacterOwnership(characterId: string, userId: string): Promise<void> {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
      select: { ownerId: true },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only create galleries for your own characters');
    }
  }
}