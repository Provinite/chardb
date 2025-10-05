import { Resolver, Query, Args } from '@nestjs/graphql';
import { Tag } from '../shared/entities/tag.entity';
import { TagsService } from './tags.service';

@Resolver(() => Tag)
export class TagsResolver {
  constructor(private readonly tagsService: TagsService) {}

  @Query(() => [Tag], { 
    description: 'Search for tags by name or get popular suggestions' 
  })
  async searchTags(
    @Args('search', { 
      type: () => String, 
      nullable: true,
      description: 'Search term to filter tags. If empty, returns popular suggestions' 
    }) 
    search?: string,
    @Args('limit', { 
      type: () => Number, 
      nullable: true, 
      defaultValue: 10,
      description: 'Maximum number of tags to return (default: 10, max: 50)'
    }) 
    limit?: number
  ): Promise<Tag[]> {
    // Cap the limit to prevent abuse
    const safeLimit = Math.min(limit || 10, 50);

    const tags = !search || search.trim().length === 0
      ? await this.tagsService.findSuggested(safeLimit)
      : await this.tagsService.search(search, safeLimit);

    // Map null to undefined for GraphQL compatibility
    return tags.map(tag => ({
      ...tag,
      category: tag.category ?? undefined,
      color: tag.color ?? undefined,
    }));
  }
}