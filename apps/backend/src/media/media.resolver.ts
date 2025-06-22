import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { Media as MediaEntity, MediaConnection } from './entities/media.entity';
import {
  MediaFiltersInput,
  CreateTextMediaInput,
  UpdateMediaInput,
  UpdateTextContentInput,
  ManageMediaTagsInput,
} from './dto/media.dto';

@Resolver(() => MediaEntity)
export class MediaResolver {
  constructor(private readonly mediaService: MediaService) {}

  @Query(() => MediaConnection)
  async media(
    @Args('filters', { nullable: true }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.mediaService.findAll(filters, user?.id);
  }

  @Query(() => MediaEntity)
  async mediaItem(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.mediaService.findOne(id, user?.id);
  }

  @Query(() => MediaConnection)
  @UseGuards(JwtAuthGuard)
  async myMedia(
    @CurrentUser() user: any,
    @Args('filters', { nullable: true }) filters?: MediaFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: user.id };
    return this.mediaService.findAll(userFilters, user.id);
  }

  @Query(() => MediaConnection)
  async userMedia(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filters', { nullable: true }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: userId };
    return this.mediaService.findAll(userFilters, user?.id);
  }

  @Query(() => MediaConnection)
  async characterMedia(
    @Args('characterId', { type: () => ID }) characterId: string,
    @Args('filters', { nullable: true }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const characterFilters = { ...filters, characterId };
    return this.mediaService.findAll(characterFilters, user?.id);
  }

  @Query(() => MediaConnection)
  async galleryMedia(
    @Args('galleryId', { type: () => ID }) galleryId: string,
    @Args('filters', { nullable: true }) filters?: MediaFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const galleryFilters = { ...filters, galleryId };
    return this.mediaService.findAll(galleryFilters, user?.id);
  }

  @Mutation(() => MediaEntity)
  @UseGuards(JwtAuthGuard)
  async createTextMedia(
    @Args('input') input: CreateTextMediaInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.createTextMedia(user.id, input);
  }

  @Mutation(() => MediaEntity)
  @UseGuards(JwtAuthGuard)
  async updateMedia(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateMediaInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.updateMedia(id, user.id, input);
  }

  @Mutation(() => MediaEntity)
  @UseGuards(JwtAuthGuard)
  async updateTextContent(
    @Args('mediaId', { type: () => ID }) mediaId: string,
    @Args('input') input: UpdateTextContentInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.updateTextContent(mediaId, user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteMedia(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.mediaService.remove(id, user.id);
  }

  @Mutation(() => MediaEntity)
  @UseGuards(JwtAuthGuard)
  async addMediaTags(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ManageMediaTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.addTags(id, user.id, input.tagNames);
  }

  @Mutation(() => MediaEntity)
  @UseGuards(JwtAuthGuard)
  async removeMediaTags(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: ManageMediaTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.mediaService.removeTags(id, user.id, input.tagNames);
  }
}