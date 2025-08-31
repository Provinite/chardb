import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TagsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get popular/suggested tags when no search term provided
   * @param limit Number of popular tags to return as suggestions
   * @returns Array of popular tags sorted by usage count
   */
  async findSuggested(limit: number = 10) {
    return this.db.tag.findMany({
      orderBy: [
        {
          characters: {
            _count: 'desc',
          },
        },
        {
          name: 'asc',
        },
      ],
      take: limit,
      include: {
        _count: {
          select: {
            characters: true,
            images: true,
            media: true,
          },
        },
      },
    });
  }

  /**
   * Search tags by partial name match
   * @param search Search term to filter tags (required)
   * @param limit Maximum number of results to return
   * @returns Array of matching tags sorted by relevance and popularity
   */
  async search(search: string, limit: number = 10) {
    if (!search || search.trim().length === 0) {
      return this.findSuggested(limit);
    }

    const searchTerm = search.trim().toLowerCase();
    
    return this.db.tag.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      },
      orderBy: [
        // Exact matches first
        {
          name: 'asc',
        },
        // Then by popularity
        {
          characters: {
            _count: 'desc',
          },
        },
      ],
      take: limit,
      include: {
        _count: {
          select: {
            characters: true,
            images: true,
            media: true,
          },
        },
      },
    });
  }

  /**
   * Find or create tags from an array of tag names
   * @param tagNames Array of tag name strings (with user's original casing)
   * @returns Array of Tag entities
   */
  async findOrCreateTags(tagNames: string[]) {
    const tags = [];
    
    for (const tagName of tagNames) {
      const tag = await this.db.tag.upsert({
        where: { name: tagName.toLowerCase() },
        create: { 
          name: tagName.toLowerCase(),
          displayName: tagName 
        },
        update: {},
      });
      tags.push(tag);
    }
    
    return tags;
  }

  /**
   * Get display names of tags associated with a character
   * @param characterId ID of the character
   * @returns Array of tag display names
   */
  async getCharacterTags(characterId: string) {
    const characterTags = await this.db.characterTag.findMany({
      where: { characterId },
      include: { tag: true },
    });
    return characterTags.map((ct) => ct.tag.displayName);
  }

  /**
   * Get all character tag relations with full tag objects
   * @param characterId the character ID
   * @returns array of tag objects
   */
  async getCharacterTagRelations(characterId: string) {
    const characterTags = await this.db.characterTag.findMany({
      where: { characterId },
      include: { tag: true },
    });
    return characterTags.map((ct) => ct.tag);
  }

}