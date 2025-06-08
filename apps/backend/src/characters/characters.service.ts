import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCharacterInput, UpdateCharacterInput, CharacterFilters } from './dto/character.dto';
import { Prisma, Visibility } from '@prisma/client';
import type { Character } from '@prisma/client';

@Injectable()
export class CharactersService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, input: CreateCharacterInput): Promise<Character> {
    const character = await this.db.character.create({
      data: {
        ...input,
        ownerId: userId,
        creatorId: userId, // Creator is the same as owner for new characters
      },
      include: {
        owner: true,
        creator: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
      },
    });
    return this.transformCharacter(character);
  }

  async findAll(filters: CharacterFilters = {}, userId?: string) {
    const {
      limit = 20,
      offset = 0,
      search,
      species,
      tags,
      ownerId,
      visibility,
      isSellable,
      isTradeable,
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
        
        // Search filter
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { species: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        
        // Other filters
        species ? { species: { contains: species, mode: 'insensitive' } } : {},
        ownerId ? { ownerId } : {},
        visibility !== undefined ? { visibility } : {},
        isSellable !== undefined ? { isSellable } : {},
        isTradeable !== undefined ? { isTradeable } : {},
        
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
        include: {
          owner: true,
          creator: true,
          tags_rel: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: {
              images: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.db.character.count({ where }),
    ]);

    return {
      characters: characters.map(character => this.transformCharacter(character)),
      total,
      hasMore: offset + limit < total,
    };
  }

  async findOne(id: string, userId?: string): Promise<Character> {
    const character = await this.db.character.findUnique({
      where: { id },
      include: {
        owner: true,
        creator: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
        images: {
          where: {
            // Only include public images unless user is the owner
            OR: userId
              ? [
                  { visibility: Visibility.PUBLIC },
                  { uploaderId: userId },
                  { character: { ownerId: userId } },
                ]
              : [{ visibility: Visibility.PUBLIC }],
          },
          orderBy: { createdAt: 'desc' },
          take: 10, // Limit to recent images
        },
        _count: {
          select: {
            images: true,
          },
        },
      },
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

    return this.transformCharacter(character);
  }

  private transformCharacter(character: any) {
    return {
      ...character,
      customFields: character.customFields ? JSON.stringify(character.customFields) : null,
    };
  }

  async update(id: string, userId: string, input: UpdateCharacterInput): Promise<Character> {
    const character = await this.findOne(id, userId);

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only edit your own characters');
    }

    const updatedCharacter = await this.db.character.update({
      where: { id },
      data: input,
      include: {
        owner: true,
        creator: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
      },
    });
    return this.transformCharacter(updatedCharacter);
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

  async transfer(id: string, currentOwnerId: string, newOwnerId: string): Promise<Character> {
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
      include: {
        owner: true,
        creator: true,
        tags_rel: {
          include: {
            tag: true,
          },
        },
      },
    });
    return this.transformCharacter(transferredCharacter);
  }

  async addTags(characterId: string, userId: string, tagNames: string[]): Promise<Character> {
    const character = await this.findOne(characterId, userId);

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only modify tags on your own characters');
    }

    // Create tags if they don't exist and connect them
    for (const tagName of tagNames) {
      const tag = await this.db.tag.upsert({
        where: { name: tagName.toLowerCase() },
        create: { name: tagName.toLowerCase() },
        update: {},
      });

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

    return this.findOne(characterId, userId);
  }

  async removeTags(characterId: string, userId: string, tagNames: string[]): Promise<Character> {
    const character = await this.findOne(characterId, userId);

    // Check ownership
    if (character.ownerId !== userId) {
      throw new ForbiddenException('You can only modify tags on your own characters');
    }

    // Remove tag connections
    await this.db.characterTag.deleteMany({
      where: {
        characterId,
        tag: {
          name: { in: tagNames.map(name => name.toLowerCase()) },
        },
      },
    });

    return this.findOne(characterId, userId);
  }
}