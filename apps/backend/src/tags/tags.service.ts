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

}