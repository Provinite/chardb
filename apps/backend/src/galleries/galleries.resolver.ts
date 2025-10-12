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
import { NotFoundException } from "@nestjs/common";
import { CurrentUser, CurrentUserType } from "../auth/decorators/CurrentUser";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowEntityOwner } from "../auth/decorators/AllowEntityOwner";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { GalleriesService } from "./galleries.service";
import { MediaService } from "../media/media.service";
import {
  Gallery,
  GalleryConnection,
  GalleryCount,
} from "./entities/gallery.entity";
import { User } from "../users/entities/user.entity";
import { Character } from "../characters/entities/character.entity";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import {
  CreateGalleryInput,
  UpdateGalleryInput,
  GalleryFiltersInput,
  ReorderGalleriesInput,
} from "./dto/gallery.dto";
import {
  mapCreateGalleryInputToService,
  mapUpdateGalleryInputToService,
  mapPrismaGalleryToGraphQL,
  mapPrismaGalleryConnectionToGraphQL,
} from "./utils/gallery-resolver-mappers";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { UsersService } from "../users/users.service";
import { CharactersService } from "../characters/characters.service";

@Resolver(() => Gallery)
export class GalleriesResolver {
  constructor(
    private readonly galleriesService: GalleriesService,
    private readonly usersService: UsersService,
    private readonly charactersService: CharactersService,
    private readonly mediaService: MediaService,
  ) {}

  @AllowAnyAuthenticated()
  @Mutation(() => Gallery)
  async createGallery(
    @Args("input") input: CreateGalleryInput,
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const serviceInput = mapCreateGalleryInputToService(input);
    const prismaResult = await this.galleriesService.create(
      user.id,
      serviceInput,
    );
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @AllowUnauthenticated()
  @Query(() => GalleryConnection)
  async galleries(
    @Args("filters", { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const serviceResult = await this.galleriesService.findAll(
      filters,
      user?.id,
    );
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Query(() => Gallery)
  async gallery(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<Gallery> {
    const prismaResult = await this.galleriesService.findOne(id, user?.id);
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowEntityOwner({ galleryId: "id" })
  @Mutation(() => Gallery)
  async updateGallery(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateGalleryInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Gallery> {
    const serviceInput = mapUpdateGalleryInputToService(input);
    const prismaResult = await this.galleriesService.update(
      id,
      user.id,
      serviceInput,
    );
    return mapPrismaGalleryToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowEntityOwner({ galleryId: "id" })
  @Mutation(() => RemovalResponse)
  async deleteGallery(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<RemovalResponse> {
    await this.galleriesService.remove(id, user.id);
    return { removed: true, message: "Gallery successfully deleted" };
  }

  // NOTE: Image-gallery operations now handled through Media system

  @AllowAnyAuthenticated()
  @Mutation(() => [Gallery])
  async reorderGalleries(
    @Args("input") input: ReorderGalleriesInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Gallery[]> {
    const prismaResults = await this.galleriesService.reorderGalleries(
      user.id,
      input.galleryIds,
    );
    return prismaResults.map(mapPrismaGalleryToGraphQL);
  }

  @AllowAnyAuthenticated()
  @Query(() => GalleryConnection)
  async myGalleries(
    @CurrentUser() user: CurrentUserType,
    @Args("filters", { nullable: true }) filters?: GalleryFiltersInput,
  ): Promise<GalleryConnection> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const userFilters = { ...filters, ownerId: user.id };
    const serviceResult = await this.galleriesService.findAll(
      userFilters,
      user.id,
    );
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Query(() => GalleryConnection)
  async userGalleries(
    @Args("userId", { type: () => ID }) userId: string,
    @Args("filters", { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const userFilters = { ...filters, ownerId: userId };
    const serviceResult = await this.galleriesService.findAll(
      userFilters,
      user?.id,
    );
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  @AllowUnauthenticated()
  @Query(() => GalleryConnection)
  async characterGalleries(
    @Args("characterId", { type: () => ID }) characterId: string,
    @Args("filters", { nullable: true }) filters?: GalleryFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<GalleryConnection> {
    const characterFilters = { ...filters, characterId };
    const serviceResult = await this.galleriesService.findAll(
      characterFilters,
      user?.id,
    );
    return mapPrismaGalleryConnectionToGraphQL(serviceResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => [Gallery])
  async likedGalleries(
    @CurrentUser() user: CurrentUserType,
  ): Promise<Gallery[]> {
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const prismaResults = await this.galleriesService.findLikedGalleries(
      user.id,
    );
    return prismaResults.map(mapPrismaGalleryToGraphQL);
  }

  // Field resolvers for relations and computed properties
  @ResolveField("owner", () => User)
  async resolveOwner(@Parent() gallery: Gallery): Promise<User> {
    const prismaUser = await this.usersService.findById(gallery.ownerId);
    if (!prismaUser) {
      throw new NotFoundException(`User with ID ${gallery.ownerId} not found`);
    }
    return mapPrismaUserToGraphQL(prismaUser);
  }

  @ResolveField("character", () => Character, { nullable: true })
  async resolveCharacter(
    @Parent() gallery: Gallery,
  ): Promise<Character | null> {
    if (!gallery.characterId) return null;

    try {
      const prismaCharacter = await this.charactersService.findOne(
        gallery.characterId,
      );
      return mapPrismaCharacterToGraphQL(prismaCharacter);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @ResolveField("likesCount", () => Int)
  async resolveLikesCount(@Parent() gallery: Gallery): Promise<number> {
    return this.galleriesService.getGalleryLikesCount(gallery.id);
  }

  @AllowAnyAuthenticated()
  @ResolveField("userHasLiked", () => Boolean)
  async resolveUserHasLiked(
    @Parent() gallery: Gallery,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<boolean> {
    return this.galleriesService.getUserHasLikedGallery(gallery.id, user?.id);
  }

  /** Gallery count field resolver */
  @ResolveField("_count", () => GalleryCount)
  async resolveCountField(@Parent() gallery: Gallery): Promise<GalleryCount> {
    const mediaCount = await this.mediaService.getGalleryMediaCount(gallery.id);
    return { media: mediaCount };
  }
}
