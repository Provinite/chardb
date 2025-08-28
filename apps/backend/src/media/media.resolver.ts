import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { MediaService } from "./media.service";
import { UsersService } from "../users/users.service";
import { CharactersService } from "../characters/characters.service";
import { GalleriesService } from "../galleries/galleries.service";
import { ImagesService } from "../images/images.service";
import { Media as MediaEntity, MediaConnection, TextContent, MediaTag } from "./entities/media.entity";
import { User } from "../users/entities/user.entity";
import { Character } from "../characters/entities/character.entity";
import { Gallery } from "../galleries/entities/gallery.entity";
import { Image } from "../images/entities/image.entity";
import {
  MediaFiltersInput,
  CreateTextMediaInput,
  UpdateMediaInput,
  UpdateTextContentInput,
  ManageMediaTagsInput,
} from "./dto/media.dto";
import {
  mapMediaFiltersInputToService,
  mapCreateTextMediaInputToService,
  mapUpdateMediaInputToService,
  mapUpdateTextContentInputToService,
  mapPrismaMediaToGraphQL,
  mapPrismaMediaConnectionToGraphQL,
} from "./utils/media-resolver-mappers";

/**
 * GraphQL resolver for media operations
 */
@Resolver(() => MediaEntity)
export class MediaResolver {
  constructor(
    private readonly mediaService: MediaService,
    private readonly usersService: UsersService,
    private readonly charactersService: CharactersService,
    private readonly galleriesService: GalleriesService,
    private readonly imagesService: ImagesService,
  ) {}

  /**
   * Retrieves paginated media with filtering and visibility controls
   */
  @Query(() => MediaConnection, { description: 'Retrieves paginated media with filtering and visibility controls' })
  async media(
    @Args("filters", { nullable: true, description: 'Optional filters for media query' }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService(filters);
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  /**
   * Retrieves a single media item by ID
   */
  @Query(() => MediaEntity, { description: 'Retrieves a single media item by ID' })
  async mediaItem(
    @Args("id", { type: () => ID, description: 'Media ID to retrieve' }) id: string,
    @CurrentUser() user?: any,
  ): Promise<MediaEntity> {
    const media = await this.mediaService.findOne(id, user?.id);
    return mapPrismaMediaToGraphQL(media);
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
    const serviceFilters = mapMediaFiltersInputToService({ ...filters, ownerId: user.id });
    const result = await this.mediaService.findAll(serviceFilters, user.id);
    return mapPrismaMediaConnectionToGraphQL(result);
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
    const serviceFilters = mapMediaFiltersInputToService({ ...filters, ownerId: userId });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
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
    const serviceFilters = mapMediaFiltersInputToService({ ...filters, characterId });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
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
    const serviceFilters = mapMediaFiltersInputToService({ ...filters, galleryId });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
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
    const serviceInput = mapCreateTextMediaInputToService(input);
    const media = await this.mediaService.createTextMedia(user.id, serviceInput);
    return mapPrismaMediaToGraphQL(media);
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
    const serviceInput = mapUpdateMediaInputToService(input);
    const media = await this.mediaService.updateMedia(id, user.id, serviceInput);
    return mapPrismaMediaToGraphQL(media);
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
    const serviceInput = mapUpdateTextContentInputToService(input);
    const media = await this.mediaService.updateTextContent(mediaId, user.id, serviceInput);
    return mapPrismaMediaToGraphQL(media);
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
    const media = await this.mediaService.addTags(id, user.id, input.tagNames);
    return mapPrismaMediaToGraphQL(media);
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
    const media = await this.mediaService.removeTags(id, user.id, input.tagNames);
    return mapPrismaMediaToGraphQL(media);
  }

  // Field Resolvers

  /**
   * Resolves the owner of a media item
   */
  @ResolveField(() => User)
  async owner(@Parent() media: MediaEntity) {
    return this.usersService.findById(media.ownerId);
  }

  /**
   * Resolves the character associated with a media item
   */
  @ResolveField(() => Character, { nullable: true })
  async character(@Parent() media: MediaEntity) {
    if (!media.characterId) return null;
    return this.charactersService.findOne(media.characterId);
  }

  /**
   * Resolves the gallery containing a media item
   */
  @ResolveField(() => Gallery, { nullable: true })
  async gallery(@Parent() media: MediaEntity): Promise<Gallery | null> {
    if (!media.galleryId) return null;
    return this.galleriesService.findOne(media.galleryId);
  }

  /**
   * Resolves the image content for image media
   */
  @ResolveField(() => Image, { nullable: true })
  async image(@Parent() media: MediaEntity) {
    if (!media.imageId) return null;
    return this.imagesService.findOne(media.imageId);
  }

  /**
   * Resolves the text content for text media
   */
  @ResolveField(() => TextContent, { nullable: true })
  async textContent(@Parent() media: MediaEntity): Promise<TextContent | null> {
    if (!media.textContentId) return null;
    return this.mediaService.findTextContent(media.textContentId);
  }

  /**
   * Resolves the tag relationships for a media item
   */
  @ResolveField(() => [MediaTag], { nullable: true })
  async tags_rel(@Parent() media: MediaEntity): Promise<MediaTag[]> {
    const mediaTags = await this.mediaService.findMediaTags(media.id);
    
    return mediaTags.map(mediaTag => ({
      tag: mediaTag.tag,
    }));
  }
}
