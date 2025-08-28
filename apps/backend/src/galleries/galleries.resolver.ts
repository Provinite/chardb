import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { GalleriesService } from './galleries.service';
import { Gallery, GalleryConnection } from './entities/gallery.entity';
import { User } from '../users/entities/user.entity';
import { Character } from '../characters/entities/character.entity';
import { RemovalResponse } from '../shared/entities/removal-response.entity';
import {
  CreateGalleryInput,
  UpdateGalleryInput,
  GalleryFiltersInput,
  ReorderGalleriesInput,
} from './dto/gallery.dto';
import {
  mapCreateGalleryInputToService,
  mapUpdateGalleryInputToService,
  mapPrismaGalleryToGraphQL,
  mapPrismaGalleryConnectionToGraphQL,
} from './utils/gallery-resolver-mappers';
import { mapPrismaUserToGraphQL } from '../users/utils/user-resolver-mappers';
import { mapPrismaCharacterToGraphQL } from '../characters/utils/character-resolver-mappers';
import { UsersService } from '../users/users.service';
import { CharactersService } from '../characters/characters.service';

@Resolver(() => Gallery)
export class GalleriesResolver {
  constructor(
    private readonly galleriesService: GalleriesService,
    private readonly usersService: UsersService,
    private readonly charactersService: CharactersService,
  ) {}

  @Mutation(() => Gallery)
  @UseGuards(JwtAuthGuard)
  async createGallery(
    @Args('input') input: CreateGalleryInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const serviceInput = mapCreateGalleryInputToService(input);
    const prismaResult = await this.galleriesService.create(user.id, serviceInput);
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @Query(() => GalleryConnection)
  async galleries(
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.galleriesService.findAll(filters, user?.id);
  }

  @Query(() => Gallery)
  async gallery(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<any> {
    return this.galleriesService.findOne(id, user?.id);
  }

  @Mutation(() => Gallery)
  @UseGuards(JwtAuthGuard)
  async updateGallery(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateGalleryInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.galleriesService.update(id, user.id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteGallery(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.galleriesService.remove(id, user.id);
  }

  // NOTE: Image-gallery operations now handled through Media system


  @Mutation(() => [Gallery])
  @UseGuards(JwtAuthGuard)
  async reorderGalleries(
    @Args('input') input: ReorderGalleriesInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.galleriesService.reorderGalleries(user.id, input.galleryIds);
  }

  // Query for user's own galleries
  @Query(() => GalleryConnection)
  @UseGuards(JwtAuthGuard)
  async myGalleries(
    @CurrentUser() user: any,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: user.id };
    return this.galleriesService.findAll(userFilters, user.id);
  }

  // Query for galleries by specific user
  @Query(() => GalleryConnection)
  async userGalleries(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: userId };
    return this.galleriesService.findAll(userFilters, user?.id);
  }

  // Query for galleries associated with a specific character
  @Query(() => GalleryConnection)
  async characterGalleries(
    @Args('characterId', { type: () => ID }) characterId: string,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const characterFilters = { ...filters, characterId };
    return this.galleriesService.findAll(characterFilters, user?.id);
  }

  // Query for galleries liked by the current user
  @Query(() => [Gallery])
  @UseGuards(JwtAuthGuard)
  async likedGalleries(
    @CurrentUser() user: any,
  ): Promise<any[]> {
    return this.galleriesService.findLikedGalleries(user.id);
  }
}