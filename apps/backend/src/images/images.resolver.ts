import { Resolver, Query, Mutation, Args, ID } from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowEntityOwner } from "../auth/decorators/AllowEntityOwner";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { ImagesService } from "./images.service";
import { Image as ImageEntity, ImageConnection } from "./entities/image.entity";
import { UpdateImageInput, ImageFiltersInput } from "./dto/image.dto";

@Resolver(() => ImageEntity)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  // Note: File upload is handled via REST endpoint /images/upload
  // This GraphQL resolver is for querying existing images

  // Return types are inferred rather than annotated. These hand back Prisma
  // rows, and the GraphQL shape is declared by the @Query decorator; the
  // entity's remaining fields (likesCount, userHasLiked) come from field
  // resolvers. Writing `Promise<ImageConnection>` here would be a lie the
  // compiler could not check, which is what the `any` it replaced was hiding.
  @Query(() => ImageConnection)
  async images(
    @Args("filters", { nullable: true }) filters?: ImageFiltersInput,
  ) {
    return this.imagesService.findAll(filters);
  }

  @Query(() => ImageEntity)
  async image(@Args("id", { type: () => ID }) id: string) {
    return this.imagesService.findOne(id);
  }

  @AllowGlobalAdmin()
  @AllowEntityOwner({ imageId: "id" })
  @Mutation(() => ImageEntity)
  async updateImage(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateImageInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ) {
    return this.imagesService.update(id, user.id, input);
  }

  @AllowGlobalAdmin()
  @AllowEntityOwner({ imageId: "id" })
  @Mutation(() => Boolean)
  async deleteImage(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.imagesService.remove(id, user.id);
  }

  // Image tag mutations removed - tags should be managed on Media entries instead

  // DEPRECATED: Image queries are blocked (no permission decorators = blocked)
  @Query(() => ImageConnection)
  async myImages(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("filters", { nullable: true }) filters?: ImageFiltersInput,
  ) {
    const userFilters = { ...filters, uploaderId: user.id };
    return this.imagesService.findAll(userFilters);
  }

  // Query for images by specific user
  @Query(() => ImageConnection)
  async userImages(
    @Args("userId", { type: () => ID }) userId: string,
    @Args("filters", { nullable: true }) filters?: ImageFiltersInput,
  ) {
    const userFilters = { ...filters, uploaderId: userId };
    return this.imagesService.findAll(userFilters);
  }

  // Query for images in a specific character
  @Query(() => ImageConnection)
  async characterImages(
    @Args("characterId", { type: () => ID }) characterId: string,
    @Args("filters", { nullable: true }) filters?: ImageFiltersInput,
  ) {
    const characterFilters = { ...filters, characterId };
    return this.imagesService.findAll(characterFilters);
  }

  // Query for images in a specific gallery
  @Query(() => ImageConnection)
  async galleryImages(
    @Args("galleryId", { type: () => ID }) galleryId: string,
    @Args("filters", { nullable: true }) filters?: ImageFiltersInput,
  ) {
    const galleryFilters = { ...filters, galleryId };
    return this.imagesService.findAll(galleryFilters);
  }
}
