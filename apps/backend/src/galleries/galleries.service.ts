import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma, Visibility } from '@chardb/database';
import type { Gallery } from '@chardb/database';

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

    return this.db.gallery.create({
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
        character: true,
      },
    });
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
          character: true,
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

    return {
      galleries,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string): Promise<Gallery> {
    const gallery = await this.db.gallery.findUnique({
      where: { id },
      include: {
        owner: true,
        character: true,
        // NOTE: Gallery images now accessed through Media system
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

    return gallery;
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

    return this.db.gallery.update({
      where: { id },
      data: input,
      include: {
        owner: true,
        character: true,
      },
    });
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
    const galleries = await this.db.gallery.findMany({
      where: {
        id: { in: galleryIds },
        ownerId: userId,
      },
    });

    if (galleries.length !== galleryIds.length) {
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

    // Return updated galleries
    return this.db.gallery.findMany({
      where: {
        id: { in: galleryIds },
      },
      include: {
        owner: true,
        character: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
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