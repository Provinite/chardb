import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAuthenticated } from '../auth/decorators/RequireAuthenticated';
import { AllowUnauthenticated } from '../auth/decorators/AllowUnauthenticated';
import { ImagesService } from './images.service';
import { Image as ImageEntity, ImageConnection } from './entities/image.entity';
import {
  UpdateImageInput,
  ImageFiltersInput,
  ManageImageTagsInput,
} from './dto/image.dto';
import type { Image } from '@chardb/database';

@Resolver(() => ImageEntity)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  // Note: File upload is handled via REST endpoint /images/upload
  // This GraphQL resolver is for querying existing images

  @Query(() => ImageConnection)
  async images(
    @Args('filters', { nullable: true }) filters?: ImageFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.imagesService.findAll(filters, user?.id);
  }

  @Query(() => ImageEntity)
  async image(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.imagesService.findOne(id, user?.id);
  }

  @RequireAuthenticated()
  @Mutation(() => ImageEntity)
  async updateImage(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateImageInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.imagesService.update(id, user.id, input);
  }

  @RequireAuthenticated()
  @Mutation(() => Boolean)
  async deleteImage(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.imagesService.remove(id, user.id);
  }

  // Image tag mutations removed - tags should be managed on Media entries instead

  // DEPRECATED: Image queries are blocked (no permission decorators = blocked)
  @Query(() => ImageConnection)
  async myImages(
    @CurrentUser() user: any,
    @Args('filters', { nullable: true }) filters?: ImageFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, uploaderId: user.id };
    return this.imagesService.findAll(userFilters, user.id);
  }

  // Query for images by specific user
  @Query(() => ImageConnection)
  async userImages(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filters', { nullable: true }) filters?: ImageFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userFilters = { ...filters, uploaderId: userId };
    return this.imagesService.findAll(userFilters, user?.id);
  }

  // Query for images in a specific character
  @Query(() => ImageConnection)
  async characterImages(
    @Args('characterId', { type: () => ID }) characterId: string,
    @Args('filters', { nullable: true }) filters?: ImageFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const characterFilters = { ...filters, characterId };
    return this.imagesService.findAll(characterFilters, user?.id);
  }

  // Query for images in a specific gallery
  @Query(() => ImageConnection)
  async galleryImages(
    @Args('galleryId', { type: () => ID }) galleryId: string,
    @Args('filters', { nullable: true }) filters?: ImageFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const galleryFilters = { ...filters, galleryId };
    return this.imagesService.findAll(galleryFilters, user?.id);
  }
}