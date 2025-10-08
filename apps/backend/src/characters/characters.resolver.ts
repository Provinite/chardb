import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Context,
  ResolveField,
  Parent,
  Int,
} from "@nestjs/graphql";
import { ForbiddenException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { RequireAuthenticated } from "../auth/decorators/RequireAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { RequireGlobalAdmin } from "../auth/decorators/RequireGlobalAdmin";
import { RequireOwnership } from "../auth/decorators/RequireOwnership";
import { RequireCommunityPermission } from "../auth/decorators/RequireCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { CharactersService } from "./characters.service";
import { TagsService } from "../tags/tags.service";
import { UsersService } from "../users/users.service";
import { MediaService } from "../media/media.service";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaMediaToGraphQL } from "../media/utils/media-resolver-mappers";
import { SpeciesVariantsService } from "../species-variants/species-variants.service";
import { SpeciesService } from "../species/species.service";
import {
  Character as CharacterEntity,
  CharacterConnection,
  CharacterCount,
  CharacterTag,
} from "./entities/character.entity";
import { Image } from "../images/entities/image.entity";
import { Media } from "../media/entities/media.entity";
import { Tag } from "../shared/entities/tag.entity";
import { ImagesService } from "../images/images.service";
import { User } from "../users/entities/user.entity";
import { SpeciesVariant } from "../species-variants/entities/species-variant.entity";
import { Species } from "../species/entities/species.entity";
import type { Prisma } from "@chardb/database";
import {
  CreateCharacterInput,
  UpdateCharacterInput,
  CharacterFiltersInput,
  TransferCharacterInput,
  ManageTagsInput,
  SetMainMediaInput,
} from "./dto/character.dto";
import { UpdateCharacterTraitsInput } from "./dto/character-trait.dto";
import {
  mapCreateCharacterInputToService,
  mapUpdateCharacterInputToService,
  mapUpdateCharacterTraitsInputToService,
  mapPrismaCharacterToGraphQL,
  mapPrismaCharacterConnectionToGraphQL,
} from "./utils/character-resolver-mappers";


@Resolver(() => CharacterEntity)
export class CharactersResolver {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly imagesService: ImagesService,
    private readonly tagsService: TagsService,
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
    private readonly speciesVariantsService: SpeciesVariantsService,
    private readonly speciesService: SpeciesService,
  ) {}

  @RequireAuthenticated()
  @Mutation(() => CharacterEntity)
  async createCharacter(
    @Args("input") input: CreateCharacterInput,
    @CurrentUser() user: any,
  ) {
    const serviceInput = mapCreateCharacterInputToService(input);
    const character = await this.charactersService.create(user.id, serviceInput);
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterConnection)
  async characters(
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: any,
  ) {
    const result = await this.charactersService.findAll(filters, user?.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterEntity)
  async character(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<CharacterEntity> {
    const character = await this.charactersService.findOne(id, user?.id);
    return mapPrismaCharacterToGraphQL(character);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => CharacterEntity)
  async updateCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateCharacterInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<any> {
    const serviceInput = mapUpdateCharacterInputToService(input);
    const character = await this.charactersService.update(id, user.id, serviceInput);
    return mapPrismaCharacterToGraphQL(character);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => Boolean)
  async deleteCharacter(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.charactersService.remove(id, user.id);
  }

  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => CharacterEntity)
  async transferCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: TransferCharacterInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<any> {
    return this.charactersService.transfer(id, user.id, input.newOwnerId);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => CharacterEntity)
  async addCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<any> {
    return this.charactersService.addTags(id, user.id, input.tagNames);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => CharacterEntity)
  async removeCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<any> {
    return this.charactersService.removeTags(id, user.id, input.tagNames);
  }

  @RequireGlobalAdmin()
  @RequireOwnership({ characterId: 'id' })
  @Mutation(() => CharacterEntity, {
    description: "Sets or clears the main media for a character",
  })
  async setCharacterMainMedia(
    @Args("id", { type: () => ID, description: "Character ID to update" })
    id: string,
    @Args("input", { description: "Main media setting parameters" })
    input: SetMainMediaInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<any> {
    return this.charactersService.setMainMedia(id, user.id, input.mediaId);
  }

  @RequireAuthenticated()
  @Query(() => CharacterConnection)
  async myCharacters(
    @CurrentUser() user: any,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: user.id };
    const result = await this.charactersService.findAll(userFilters, user.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterConnection)
  async userCharacters(
    @Args("userId", { type: () => ID }) userId: string,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: any,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: userId };
    const result = await this.charactersService.findAll(userFilters, user?.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  // Field resolver to return displayName values for tags string array
  @ResolveField("tags", () => [String])
  async resolveTagsField(
    @Parent() character: CharacterEntity,
  ): Promise<string[]> {
    return this.tagsService.getCharacterTags(character.id);
  }

  @ResolveField("likesCount", () => Int)
  async resolveLikesCountField(@Parent() character: CharacterEntity): Promise<number> {
    const count = await this.charactersService.getLikesCount(character.id);
    return count;
  }

  @RequireAuthenticated()
  @ResolveField("userHasLiked", () => Boolean)
  async resolveUserHasLikedField(
    @Parent() character: CharacterEntity,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.charactersService.hasUserLiked(character.id, user.id);
  }

  /** Character count field resolver */
  @ResolveField("_count", () => CharacterCount)
  async resolveCountField(@Parent() character: CharacterEntity): Promise<CharacterCount> {
    const mediaCount = await this.mediaService.getCharacterMediaCount(character.id);
    return { media: mediaCount };
  }

  /** Character creator field resolver */
  @ResolveField("creator", () => User, { nullable: true })
  async resolveCreatorField(@Parent() character: CharacterEntity): Promise<User | null> {
    if (!character.creatorId) return null;
    const user = await this.usersService.findById(character.creatorId);
    return user ? mapPrismaUserToGraphQL(user) : null;
  }

  /** Character owner field resolver */
  @ResolveField("owner", () => User)
  async resolveOwnerField(@Parent() character: CharacterEntity): Promise<User> {
    const user = await this.usersService.findById(character.ownerId);
    if (!user) throw new Error('Owner not found');
    return mapPrismaUserToGraphQL(user);
  }

  /** Main media field resolver */
  @ResolveField("mainMedia", () => Media, { nullable: true, description: "Main media item for this character (image or text)" })
  async resolveMainMediaField(@Parent() character: CharacterEntity): Promise<Media | null> {
    if (!character.mainMediaId) return null;
    const media = await this.mediaService.findOne(character.mainMediaId);
    return media ? mapPrismaMediaToGraphQL(media) : null;
  }

  /** Character tags relation field resolver */
  @ResolveField("tags_rel", () => [CharacterTag])
  async resolveTagsRelField(@Parent() character: CharacterEntity): Promise<CharacterTag[]> {
    const tags = await this.tagsService.getCharacterTagRelations(character.id);
    return tags.map(tag => ({
      character,
      tag: {
        ...tag,
        category: tag.category ?? undefined,
        color: tag.color ?? undefined,
      }
    }));
  }

  /** Species field resolver */
  @ResolveField("species", () => Species, { nullable: true, description: "Species this character belongs to" })
  async resolveSpeciesField(@Parent() character: CharacterEntity): Promise<Species | null> {
    if (!character.speciesId) return null;
    return this.speciesService.findOne(character.speciesId);
  }

  /** Species variant field resolver */
  @ResolveField("speciesVariant", () => SpeciesVariant, { nullable: true, description: "Species variant this character belongs to" })
  async resolveSpeciesVariantField(@Parent() character: CharacterEntity): Promise<SpeciesVariant | null> {
    if (!character.speciesVariantId) return null;
    return this.speciesVariantsService.findOne(character.speciesVariantId);
  }

  @RequireGlobalAdmin()
  @RequireCommunityPermission(CommunityPermission.CanEditCharacter)
  @ResolveCommunityFrom({ characterId: 'id' })
  @Mutation(() => CharacterEntity, {
    description: "Update character trait values",
  })
  async updateCharacterTraits(
    @Args("id", { type: () => ID }) id: string,
    @Args("updateCharacterTraitsInput")
    updateCharacterTraitsInput: UpdateCharacterTraitsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    const serviceInput = mapUpdateCharacterTraitsInputToService(
      updateCharacterTraitsInput,
    );
    const prismaResult = await this.charactersService.updateTraits(
      id,
      serviceInput,
      user.id,
    );
    return mapPrismaCharacterToGraphQL(prismaResult);
  }
}
