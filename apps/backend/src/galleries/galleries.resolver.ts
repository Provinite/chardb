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
  @UseGuards(OptionalJwtAuthGuard)
  async galleries(
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const serviceResult = await this.galleriesService.findAll(filters, user?.id);
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  @Query(() => Gallery)
  @UseGuards(OptionalJwtAuthGuard)
  async gallery(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<Gallery> {
    const prismaResult = await this.galleriesService.findOne(id, user?.id);
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @Mutation(() => Gallery)
  @UseGuards(JwtAuthGuard)
  async updateGallery(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateGalleryInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const serviceInput = mapUpdateGalleryInputToService(input);
    const prismaResult = await this.galleriesService.update(id, user.id, serviceInput);
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @Mutation(() => RemovalResponse)
  @UseGuards(JwtAuthGuard)
  async deleteGallery(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: CurrentUserType,
  ): Promise<RemovalResponse> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.galleriesService.remove(id, user.id);
    return { removed: true, message: 'Gallery successfully deleted' };
  }

  // NOTE: Image-gallery operations now handled through Media system


  @Mutation(() => [Gallery])
  @UseGuards(JwtAuthGuard)
  async reorderGalleries(
    @Args('input') input: ReorderGalleriesInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery[]> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const prismaResults = await this.galleriesService.reorderGalleries(user.id, input.galleryIds);
    return prismaResults.map(mapPrismaGalleryToGraphQL);
  }

  // Query for user's own galleries
  @Query(() => GalleryConnection)
  @UseGuards(JwtAuthGuard)
  async myGalleries(
    @CurrentUser() user: CurrentUserType,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
  ): Promise<GalleryConnection> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const userFilters = { ...filters, ownerId: user.id };
    const serviceResult = await this.galleriesService.findAll(userFilters, user.id);
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  // Query for galleries by specific user
  @Query(() => GalleryConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async userGalleries(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const userFilters = { ...filters, ownerId: userId };
    const serviceResult = await this.galleriesService.findAll(userFilters, user?.id);
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  // Query for galleries associated with a specific character
  @Query(() => GalleryConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async characterGalleries(
    @Args('characterId', { type: () => ID }) characterId: string,
    @Args('filters', { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const characterFilters = { ...filters, characterId };
    const serviceResult = await this.galleriesService.findAll(characterFilters, user?.id);
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  // Query for galleries liked by the current user
  @Query(() => [Gallery])
  @UseGuards(JwtAuthGuard)
  async likedGalleries(
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery[]> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const prismaResults = await this.galleriesService.findLikedGalleries(user.id);
    return prismaResults.map(mapPrismaGalleryToGraphQL);
  }

  // Field resolvers for relations and computed properties
  @ResolveField('owner', () => User)
  async resolveOwner(@Parent() gallery: Gallery): Promise<User> {
    const prismaUser = await this.usersService.findById(gallery.ownerId);
    if (!prismaUser) {
      throw new NotFoundException(`User with ID ${gallery.ownerId} not found`);
    }
    return mapPrismaUserToGraphQL(prismaUser);
  }

  @ResolveField('character', () => Character, { nullable: true })
  async resolveCharacter(@Parent() gallery: Gallery): Promise<Character | null> {
    if (!gallery.characterId) return null;
    
    try {
      const prismaCharacter = await this.charactersService.findOne(gallery.characterId);
      return mapPrismaCharacterToGraphQL(prismaCharacter);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @ResolveField('likesCount', () => Number)
  async resolveLikesCount(@Parent() gallery: Gallery): Promise<number> {
    return this.galleriesService.getGalleryLikesCount(gallery.id);
  }

  @ResolveField('userHasLiked', () => Boolean)
  async resolveUserHasLiked(
    @Parent() gallery: Gallery,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<boolean> {
    return this.galleriesService.getUserHasLikedGallery(gallery.id, user?.id);
  }
}