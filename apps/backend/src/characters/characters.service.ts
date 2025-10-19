import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TagsService } from '../tags/tags.service';
import { Prisma, Visibility } from '@chardb/database';

// Service layer interfaces
export interface CharacterServiceFilters {
  limit?: number;
  offset?: number;
  search?: string;
  species?: string;
  speciesId?: string;
  speciesVariantId?: string;
  tags?: string[];
  ownerId?: string;
  visibility?: Visibility;
  isSellable?: boolean;
  isTradeable?: boolean;
  gender?: string;
  ageRange?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: string;
  searchFields?: string;
}

@Injectable()
export class CharactersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tagsService: TagsService,
  ) {}

  async create(
    userId: string,
    input: {
      characterData: Omit<Prisma.CharacterCreateInput, 'owner' | 'creator'>;
      tags?: string[];
    },
  ) {
    const { characterData, tags } = input;

    const character = await this.db.character.create({
      data: {
        owner: {
          connect: { id: userId },
        },
        creator: {
          connect: { id: userId },
        },
        ...characterData,
      },
    });

    // Handle tags if provided
    if (tags && tags.length > 0) {
      const tagModels = await this.tagsService.findOrCreateTags(tags);

      for (const tag of tagModels) {
        await this.db.characterTag.create({
          data: {
            characterId: character.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Return the created character
    return character;
  }

  async findAll(filters: CharacterServiceFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      search,
      species,
      speciesId,
      speciesVariantId,
      tags,
      ownerId,
      visibility,
      isSellable,
      isTradeable,
      gender,
      ageRange,
      minPrice,
      maxPrice,
      sortBy = 'created',
      sortOrder = 'desc',
      searchFields = 'all',
    } = filters;

    const where: Prisma.CharacterWhereInput = {
      AND: [
        // Visibility filter - only show public characters unless owner/admin
        userId
          ? {
              OR: [
                { visibility: Visibility.PUBLIC },
                { ownerId: userId }, // Owner can see their own private characters
                { visibility: Visibility.UNLISTED }, // Unlisted characters are visible if you have the link
              ],
            }
          : { visibility: Visibility.PUBLIC }, // Only public for anonymous users

        // Enhanced search filter
        search
          ? {
              OR: this.buildSearchConditions(search, searchFields),
            }
          : {},

        // Other filters
        species
          ? { species: { name: { contains: species, mode: 'insensitive' } } }
          : {},
        speciesId ? { speciesId } : {},
        speciesVariantId ? { speciesVariantId } : {},
        gender ? { gender: { contains: gender, mode: 'insensitive' } } : {},
        ageRange ? { age: { contains: ageRange, mode: 'insensitive' } } : {},
        ownerId ? { ownerId } : {},
        visibility !== undefined ? { visibility } : {},
        isSellable !== undefined ? { isSellable } : {},
        isTradeable !== undefined ? { isTradeable } : {},

        // Price range filter
        minPrice !== undefined || maxPrice !== undefined
          ? {
              AND: [
                minPrice !== undefined ? { price: { gte: minPrice } } : {},
                maxPrice !== undefined ? { price: { lte: maxPrice } } : {},
              ],
            }
          : {},

        // Tags filter
        tags && tags.length > 0
          ? {
              tags_rel: {
                some: {
                  tag: {
                    name: { in: tags },
                  },
                },
              },
            }
          : {},
      ],
    };

    const [characters, total] = await Promise.all([
      this.db.character.findMany({
        where,
        orderBy: this.buildOrderBy(sortBy, sortOrder),
        take: limit,
        skip: offset,
      }),
      this.db.character.count({ where }),
    ]);

    return {
      characters,
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string) {
    const character = await this.db.character.findUnique({
      where: { id },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Check visibility permissions
    if (character.visibility === Visibility.PRIVATE) {
      if (!userId || character.ownerId !== userId) {
        throw new ForbiddenException('Character is private');
      }
    }

    return character;
  }

  async update(
    id: string,
    userId: string,
    input: { characterData: Prisma.CharacterUpdateInput; tags?: string[] },
  ) {
    const character = await this.findOne(id, userId);

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own characters');
    }

    const { characterData, tags } = input;

    const updatedCharacter = await this.db.character.update({
      where: { id },
      data: characterData,
    });

    // Handle tags if provided
    if (tags !== undefined) {
      // Remove all existing character-tag relationships
      await this.db.characterTag.deleteMany({
        where: { characterId: id },
      });

      // Add new tags if provided
      if (tags.length > 0) {
        const tagModels = await this.tagsService.findOrCreateTags(tags);

        for (const tag of tagModels) {
          await this.db.characterTag.create({
            data: {
              characterId: id,
              tagId: tag.id,
            },
          });
        }
      }
    }

    // Return the updated character
    return updatedCharacter;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const character = await this.findOne(id, userId);

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own characters');
    }

    await this.db.character.delete({
      where: { id },
    });

    return true;
  }

  async transfer(id: string, currentOwnerId: string, newOwnerId: string) {
    const character = await this.findOne(id, currentOwnerId);

    // Check ownership
    if (character.ownerId !== currentOwnerId) {
      throw new ForbiddenException('You can only transfer your own characters');
    }

    // Verify new owner exists
    const newOwner = await this.db.user.findUnique({
      where: { id: newOwnerId },
    });

    if (!newOwner) {
      throw new NotFoundException('New owner not found');
    }

    const transferredCharacter = await this.db.character.update({
      where: { id },
      data: {
        ownerId: newOwnerId,
        // Keep original creator
      },
    });
    return transferredCharacter;
  }

  async addTags(characterId: string, userId: string, tagNames: string[]) {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only modify tags on your own characters',
      );
    }

    // Create tags if they don't exist and connect them
    const tags = await this.tagsService.findOrCreateTags(tagNames);

    for (const tag of tags) {
      await this.db.characterTag.upsert({
        where: {
          characterId_tagId: {
            characterId,
            tagId: tag.id,
          },
        },
        create: {
          characterId,
          tagId: tag.id,
        },
        update: {},
      });
    }

    return character;
  }

  async removeTags(characterId: string, userId: string, tagNames: string[]) {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only modify tags on your own characters',
      );
    }

    // Remove tag connections
    await this.db.characterTag.deleteMany({
      where: {
        characterId,
        tag: {
          name: { in: tagNames.map((name) => name.toLowerCase()) },
        },
      },
    });

    return character;
  }

  /**
   * Sets or clears the main media for a character
   * @param characterId ID of the character to update
   * @param userId ID of the user making the request (must be character owner)
   * @param mediaId Media ID to set as main, or undefined to clear
   * @returns Updated character with new main media
   * @throws ForbiddenException if user doesn't own the character or media doesn't belong to character
   * @throws NotFoundException if media doesn't exist
   */
  async setMainMedia(characterId: string, userId: string, mediaId?: string) {
    const character = await this.db.character.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException(
        'You can only set main media on your own characters',
      );
    }

    // If mediaId is provided, verify the media exists and belongs to this character
    if (mediaId) {
      const media = await this.db.media.findUnique({
        where: { id: mediaId },
      });

      if (!media) {
        throw new NotFoundException('Media not found');
      }

      if (media.characterId !== characterId) {
        throw new ForbiddenException('Media must belong to this character');
      }
    }

    // Update character with new main media (or null to clear)
    const updatedCharacter = await this.db.character.update({
      where: { id: characterId },
      data: { mainMediaId: mediaId },
    });

    return updatedCharacter;
  }

  private buildSearchConditions(search: string, searchFields: string) {
    const searchTerm = { contains: search, mode: 'insensitive' as const };

    switch (searchFields) {
      case 'name':
        return [{ name: searchTerm }];
      case 'description':
        return [{ description: searchTerm }];
      case 'personality':
        return [{ personality: searchTerm }];
      case 'backstory':
        return [{ backstory: searchTerm }];
      default: // 'all'
        return [
          { name: searchTerm },
          { description: searchTerm },
          { personality: searchTerm },
          { backstory: searchTerm },
          { species: { name: searchTerm } },
        ];
    }
  }

  private buildOrderBy(sortBy: string, sortOrder: string) {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    switch (sortBy) {
      case 'name':
        return { name: order } as const;
      case 'updated':
        return { updatedAt: order } as const;
      case 'price':
        return { price: order } as const;
      default: // 'created'
        return { createdAt: order } as const;
    }
  }

  /** Update character trait values */
  async updateTraits(
    id: string,
    updateData: { traitValues: PrismaJson.CharacterTraitValuesJson },
    userId: string,
  ) {
    // First verify user owns or created this character
    const character = await this.db.character.findUnique({
      where: { id },
      select: { ownerId: true, creatorId: true },
    });

    if (!character) {
      throw new NotFoundException(`Character with ID ${id} not found`);
    }

    if (character.ownerId !== userId && character.creatorId !== userId) {
      throw new ForbiddenException(
        'You can only update traits for characters you own or created',
      );
    }

    // Update the character with new trait values
    return this.db.character.update({
      where: { id },
      data: {
        traitValues: updateData.traitValues,
      },
    });
  }

  async getLikesCount(characterId: string) {
    return this.db.like.count({
      where: { characterId },
    });
  }

  async hasUserLiked(characterId: string, userId: string) {
    const like = await this.db.like.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
    });
    return !!like;
  }
}
