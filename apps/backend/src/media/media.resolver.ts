import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { MediaService } from "./media.service";
import { Media as MediaEntity, MediaConnection } from "./entities/media.entity";
import {
  MediaFiltersInput,
  CreateTextMediaInput,
  UpdateMediaInput,
  UpdateTextContentInput,
  ManageMediaTagsInput,
} from "./dto/media.dto";

/**
 * GraphQL resolver for media operations
 */
@Resolver(() => MediaEntity)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Retrieves paginated media with filtering and visibility controls
   */
  @Query(() => MediaConnection, { description: 'Retrieves paginated media with filtering and visibility controls' })
  async media(
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    return this.mediaService.findAll(filters, user?.id);
  }

  /**
   * Retrieves a single media item by ID
   */
  @Query(() => MediaEntity, { description: 'Retrieves a single media item by ID' })
  async mediaItem(
    @Args("id", { type: () => ID, description: 'Media ID to retrieve' }) id: string,
    @CurrentUser() user?: any,
  ): Promise<MediaEntity> {
    return this.mediaService.findOne(id, user?.id);
  }

  /**
   * Retrieves media owned by the current authenticated user
   */
  @Query(() => MediaConnection, { description: 'Retrieves media owned by the current authenticated user' })
  @UseGuards(JwtAuthGuard)
  async myMedia(
    @CurrentUser() user: any,
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
  ): Promise<MediaConnection> {
    const userFilters = { ...filters, ownerId: user.id };
    return this.mediaService.findAll(userFilters, user.id);
  }

  /**
   * Retrieves media owned by a specific user
   */
  @Query(() => MediaConnection, { description: 'Retrieves media owned by a specific user' })
  async userMedia(
    @Args("userId", { type: () => ID, description: 'User ID whose media to retrieve' }) userId: string,
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const userFilters = { ...filters, ownerId: userId };
    return this.mediaService.findAll(userFilters, user?.id);
  }

  /**
   * Retrieves media associated with a specific character
   */
  @Query(() => MediaConnection, { description: 'Retrieves media associated with a specific character' })
  async characterMedia(
    @Args("characterId", { type: () => ID, description: 'Character ID whose media to retrieve' }) characterId: string,
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const characterFilters = { ...filters, characterId };
    return this.mediaService.findAll(characterFilters, user?.id);
  }

  /**
   * Retrieves media from a specific gallery
   */
  @Query(() => MediaConnection, { description: 'Retrieves media from a specific gallery' })
  async galleryMedia(
    @Args("galleryId", { type: () => ID, description: 'Gallery ID whose media to retrieve' }) galleryId: string,
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const galleryFilters = { ...filters, galleryId };
    return this.mediaService.findAll(galleryFilters, user?.id);
  }

  /**
   * Creates a new text media item
   */
  @Mutation(() => MediaEntity, { description: 'Creates a new text media item' })
  @UseGuards(JwtAuthGuard)
  async createTextMedia(
    @Args("input", { description: 'Text media creation parameters' }) input: CreateTextMediaInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    return this.mediaService.createTextMedia(user.id, input);
  }

  /**
   * Updates media metadata (title, description, etc.)
   */
  @Mutation(() => MediaEntity, { description: 'Updates media metadata (title, description, etc.)' })
  @UseGuards(JwtAuthGuard)
  async updateMedia(
    @Args("id", { type: () => ID, description: 'Media ID to update' }) id: string,
    @Args("input", { description: 'Updated media parameters' }) input: UpdateMediaInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    return this.mediaService.updateMedia(id, user.id, input);
  }

  /**
   * Updates the text content of a text media item
   */
  @Mutation(() => MediaEntity, { description: 'Updates the text content of a text media item' })
  @UseGuards(JwtAuthGuard)
  async updateTextContent(
    @Args("mediaId", { type: () => ID, description: 'Media ID containing the text content to update' }) mediaId: string,
    @Args("input", { description: 'Updated text content parameters' }) input: UpdateTextContentInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    return this.mediaService.updateTextContent(mediaId, user.id, input);
  }

  /**
   * Deletes a media item and its associated content
   */
  @Mutation(() => Boolean, { description: 'Deletes a media item and its associated content' })
  @UseGuards(JwtAuthGuard)
  async deleteMedia(
    @Args("id", { type: () => ID, description: 'Media ID to delete' }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.mediaService.remove(id, user.id);
  }

  /**
   * Adds tags to a media item
   */
  @Mutation(() => MediaEntity, { description: 'Adds tags to a media item' })
  @UseGuards(JwtAuthGuard)
  async addMediaTags(
    @Args("id", { type: () => ID, description: 'Media ID to add tags to' }) id: string,
    @Args("input", { description: 'Tags to add to the media' }) input: ManageMediaTagsInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    return this.mediaService.addTags(id, user.id, input.tagNames);
  }

  /**
   * Removes tags from a media item
   */
  @Mutation(() => MediaEntity, { description: 'Removes tags from a media item' })
  @UseGuards(JwtAuthGuard)
  async removeMediaTags(
    @Args("id", { type: () => ID, description: 'Media ID to remove tags from' }) id: string,
    @Args("input", { description: 'Tags to remove from the media' }) input: ManageMediaTagsInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    return this.mediaService.removeTags(id, user.id, input.tagNames);
  }
}
