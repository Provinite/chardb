import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ResolveField,
  Parent,
  Int,
} from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequireAuthenticated } from "../auth/decorators/RequireAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { RequireGlobalAdmin } from "../auth/decorators/RequireGlobalAdmin";
import { RequireOwnership } from "../auth/decorators/RequireOwnership";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { MediaService } from "./media.service";
import { UsersService } from "../users/users.service";
import { CharactersService } from "../characters/characters.service";
import { GalleriesService } from "../galleries/galleries.service";
import { ImagesService } from "../images/images.service";
import {
  Media as MediaEntity,
  MediaConnection,
  TextContent,
  MediaTag,
} from "./entities/media.entity";
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
import { mapPrismaGalleryToGraphQL } from "../galleries/utils/gallery-resolver-mappers";

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

  @AllowUnauthenticated()
  @Query(() => MediaConnection, {
    description:
      "Retrieves paginated media with filtering and visibility controls",
  })
  async media(
    @Args("filters", {
      nullable: true,
      description: "Optional filters for media query",
    })
    filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService(filters);
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => MediaEntity, {
    description: "Retrieves a single media item by ID",
  })
  async mediaItem(
    @Args("id", { type: () => ID, description: "Media ID to retrieve" })
    id: string,
    @CurrentUser() user?: any,
  ): Promise<MediaEntity> {
    const media = await this.mediaService.findOne(id, user?.id);
    return mapPrismaMediaToGraphQL(media);
  }

  @RequireAuthenticated()
  @Query(() => MediaConnection, {
    description: "Retrieves media owned by the current authenticated user",
  })
  async myMedia(
    @CurrentUser() user: any,
    @Args("filters", {
      nullable: true,
      description: "Optional filters for media query",
    })
    filters?: MediaFiltersInput,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService({
      ...filters,
      ownerId: user.id,
    });
    const result = await this.mediaService.findAll(serviceFilters, user.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => MediaConnection, {
    description: "Retrieves media owned by a specific user",
  })
  async userMedia(
    @Args("userId", {
      type: () => ID,
      description: "User ID whose media to retrieve",
    })
    userId: string,
    @Args("filters", {
      nullable: true,
      description: "Optional filters for media query",
    })
    filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService({
      ...filters,
      ownerId: userId,
    });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => MediaConnection, {
    description: "Retrieves media associated with a specific character",
  })
  async characterMedia(
    @Args("characterId", {
      type: () => ID,
      description: "Character ID whose media to retrieve",
    })
    characterId: string,
    @Args("filters", {
      nullable: true,
      description: "Optional filters for media query",
    })
    filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService({
      ...filters,
      characterId,
    });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => MediaConnection, {
    description: "Retrieves media from a specific gallery",
  })
  async galleryMedia(
    @Args("galleryId", {
      type: () => ID,
      description: "Gallery ID whose media to retrieve",
    })
    galleryId: string,
    @Args("filters", {
      nullable: true,
      description: "Optional filters for media query",
    })
    filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<MediaConnection> {
    const serviceFilters = mapMediaFiltersInputToService({
      ...filters,
      galleryId,
    });
    const result = await this.mediaService.findAll(serviceFilters, user?.id);
    return mapPrismaMediaConnectionToGraphQL(result);
  }

  @RequireAuthenticated()
  @Mutation(() => MediaEntity, { description: "Creates a new text media item" })
  async createTextMedia(
    @Args("input", { description: "Text media creation parameters" })
    input: CreateTextMediaInput,
    @CurrentUser() user: any,
  ): Promise<MediaEntity> {
    const serviceInput = mapCreateTextMediaInputToService(input);
    const media = await this.mediaService.createTextMedia(
      user.id,
      serviceInput,
    );
    return mapPrismaMediaToGraphQL(media);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ mediaId: 'id' })
  @Mutation(() => MediaEntity, {
    description: "Updates media metadata (title, description, etc.)",
  })
  async updateMedia(
    @Args("id", { type: () => ID, description: "Media ID to update" })
    id: string,
    @Args("input", { description: "Updated media parameters" })
    input: UpdateMediaInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<MediaEntity> {
    const serviceInput = mapUpdateMediaInputToService(input);
    const media = await this.mediaService.updateMedia(
      id,
      user.id,
      serviceInput,
    );
    return mapPrismaMediaToGraphQL(media);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ mediaId: 'mediaId' })
  @Mutation(() => MediaEntity, {
    description: "Updates the text content of a text media item",
  })
  async updateTextContent(
    @Args("mediaId", {
      type: () => ID,
      description: "Media ID containing the text content to update",
    })
    mediaId: string,
    @Args("input", { description: "Updated text content parameters" })
    input: UpdateTextContentInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<MediaEntity> {
    const serviceInput = mapUpdateTextContentInputToService(input);
    const media = await this.mediaService.updateTextContent(
      mediaId,
      user.id,
      serviceInput,
    );
    if (!media) throw new Error('Media not found');
    return mapPrismaMediaToGraphQL(media);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ mediaId: 'id' })
  @Mutation(() => Boolean, {
    description: "Deletes a media item and its associated content",
  })
  async deleteMedia(
    @Args("id", { type: () => ID, description: "Media ID to delete" })
    id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.mediaService.remove(id, user.id);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ mediaId: 'id' })
  @Mutation(() => MediaEntity, { description: "Adds tags to a media item" })
  async addMediaTags(
    @Args("id", { type: () => ID, description: "Media ID to add tags to" })
    id: string,
    @Args("input", { description: "Tags to add to the media" })
    input: ManageMediaTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<MediaEntity> {
    const media = await this.mediaService.addTags(id, user.id, input.tagNames);
    return mapPrismaMediaToGraphQL(media);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ mediaId: 'id' })
  @Mutation(() => MediaEntity, {
    description: "Removes tags from a media item",
  })
  async removeMediaTags(
    @Args("id", { type: () => ID, description: "Media ID to remove tags from" })
    id: string,
    @Args("input", { description: "Tags to remove from the media" })
    input: ManageMediaTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<MediaEntity> {
    const media = await this.mediaService.removeTags(
      id,
      user.id,
      input.tagNames,
    );
    return mapPrismaMediaToGraphQL(media);
  }

  // Field Resolvers

  /**
   * Resolves the owner of a media item
   */
  @ResolveField(() => User, { description: "The user who owns this media" })
  async owner(@Parent() media: MediaEntity) {
    return this.usersService.findById(media.ownerId);
  }

  /**
   * Resolves the character associated with a media item
   */
  @ResolveField(() => Character, {
    nullable: true,
    description: "The character this media is associated with, if any",
  })
  async character(@Parent() media: MediaEntity) {
    if (!media.characterId) return null;
    return this.charactersService.findOne(media.characterId);
  }

  /**
   * Resolves the gallery containing a media item
   */
  @ResolveField(() => Gallery, {
    nullable: true,
    description: "The gallery this media belongs to, if any",
  })
  async gallery(@Parent() media: MediaEntity): Promise<Gallery | null> {
    if (!media.galleryId) return null;
    const gallery = await this.galleriesService.findOne(media.galleryId);
    return gallery ? mapPrismaGalleryToGraphQL(gallery) : null;
  }

  /**
   * Resolves the image content for image media
   */
  @ResolveField(() => Image, {
    nullable: true,
    description: "Image content (populated for image media)",
  })
  async image(@Parent() media: MediaEntity) {
    if (!media.imageId) return null;
    return this.imagesService.findOne(media.imageId);
  }

  /**
   * Resolves the text content for text media
   */
  @ResolveField(() => TextContent, {
    nullable: true,
    description: "Text content (populated for text media)",
  })
  async textContent(@Parent() media: MediaEntity): Promise<TextContent | null> {
    if (!media.textContentId) return null;
    return this.mediaService.findTextContent(media.textContentId);
  }

  /**
   * Resolves the tag relationships for a media item
   */
  @ResolveField(() => [MediaTag], {
    nullable: true,
    description: "Tag relationships for this media",
  })
  async tags_rel(@Parent() media: MediaEntity): Promise<MediaTag[]> {
    const mediaTags = await this.mediaService.findMediaTags(media.id);

    return mediaTags.map((mediaTag) => ({
      tag: {
        ...mediaTag.tag,
        category: mediaTag.tag.category ?? undefined,
        color: mediaTag.tag.color ?? undefined,
      },
    }));
  }

  /**
   * Resolves the likes count for a media item
   */
  @ResolveField(() => Int, {
    description: "Number of likes this media has received",
  })
  async likesCount(@Parent() media: MediaEntity): Promise<number> {
    // TODO: Implement when social features are added
    return 0;
  }

  /**
   * Resolves whether the current user has liked this media
   */
  @RequireAuthenticated()
  @ResolveField(() => Boolean, {
    description: "Whether the current user has liked this media",
  })
  async userHasLiked(
    @Parent() media: MediaEntity,
    @CurrentUser() user?: any,
  ): Promise<boolean> {
    // TODO: Implement when social features are added
    return false;
  }

  /**
   * Get the number of galleries this media appears in
   */
  @ResolveField(() => Int, {
    description: "Number of galleries this media appears in",
  })
  async galleryCount(@Parent() media: MediaEntity): Promise<number> {
    return this.mediaService.getMediaGalleryCount(media.id);
  }

  /**
   * Get the number of characters this media is associated with
   */
  @ResolveField(() => Int, {
    description: "Number of characters this media is associated with",
  })
  async characterCount(@Parent() media: MediaEntity): Promise<number> {
    return this.mediaService.getMediaCharacterCount(media.id);
  }
}
