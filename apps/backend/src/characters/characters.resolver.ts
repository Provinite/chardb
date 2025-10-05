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
import { UseGuards, ForbiddenException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { CurrentUser, CurrentUserType } from "../auth/decorators/current-user.decorator";
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

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async createCharacter(
    @Args("input") input: CreateCharacterInput,
    @CurrentUser() user: any,
  ) {
    const serviceInput = mapCreateCharacterInputToService(input);
    const character = await this.charactersService.create(user.id, serviceInput);
    return mapPrismaCharacterToGraphQL(character);
  }

  @Query(() => CharacterConnection)
  @UseGuards(OptionalJwtAuthGuard)
  async characters(
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: any,
  ) {
    const result = await this.charactersService.findAll(filters, user?.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @Query(() => CharacterEntity)
  @UseGuards(OptionalJwtAuthGuard)
  async character(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: any,
  ): Promise<CharacterEntity> {
    const character = await this.charactersService.findOne(id, user?.id);
    return mapPrismaCharacterToGraphQL(character);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async updateCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateCharacterInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    const serviceInput = mapUpdateCharacterInputToService(input);
    const character = await this.charactersService.update(id, user.id, serviceInput);
    return mapPrismaCharacterToGraphQL(character);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteCharacter(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: any,
  ): Promise<boolean> {
    return this.charactersService.remove(id, user.id);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async transferCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: TransferCharacterInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.transfer(id, user.id, input.newOwnerId);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async addCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.addTags(id, user.id, input.tagNames);
  }

  @Mutation(() => CharacterEntity)
  @UseGuards(JwtAuthGuard)
  async removeCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.removeTags(id, user.id, input.tagNames);
  }

  @Mutation(() => CharacterEntity, {
    description: "Sets or clears the main media for a character",
  })
  @UseGuards(JwtAuthGuard)
  async setCharacterMainMedia(
    @Args("id", { type: () => ID, description: "Character ID to update" })
    id: string,
    @Args("input", { description: "Main media setting parameters" })
    input: SetMainMediaInput,
    @CurrentUser() user: any,
  ): Promise<any> {
    return this.charactersService.setMainMedia(id, user.id, input.mediaId);
  }

  // Query for user's own characters
  @Query(() => CharacterConnection)
  @UseGuards(JwtAuthGuard)
  async myCharacters(
    @CurrentUser() user: any,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<any> {
    const userFilters = { ...filters, ownerId: user.id };
    const result = await this.charactersService.findAll(userFilters, user.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  // Query for characters by specific user
  @Query(() => CharacterConnection)
  @UseGuards(OptionalJwtAuthGuard)
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

  @ResolveField("userHasLiked", () => Boolean)
  async resolveUserHasLikedField(
    @Parent() character: CharacterEntity,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<boolean> {
    if (!user) return false;
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

  /** Update character trait values */
  @Mutation(() => CharacterEntity, {
    description: "Update character trait values",
  })
  @UseGuards(JwtAuthGuard)
  async updateCharacterTraits(
    @Args("id", { type: () => ID }) id: string,
    @Args("updateCharacterTraitsInput")
    updateCharacterTraitsInput: UpdateCharacterTraitsInput,
    @CurrentUser() user: any,
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
