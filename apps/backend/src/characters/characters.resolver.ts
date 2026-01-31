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
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import {
  AuthenticatedCurrentUserType,
  CurrentUserType,
} from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowEntityOwner } from "../auth/decorators/AllowEntityOwner";
import { AllowCommunityPermission } from "../auth/decorators/AllowCommunityPermission";
import { ResolveCommunityFrom } from "../auth/decorators/ResolveCommunityFrom";
import { CommunityPermission } from "../auth/CommunityPermission";
import { AllowCharacterEditor } from "../auth/decorators/AllowCharacterEditor";
import { CharactersService } from "./characters.service";
import { TagsService } from "../tags/tags.service";
import { UsersService } from "../users/users.service";
import { MediaService } from "../media/media.service";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaMediaToGraphQL } from "../media/utils/media-resolver-mappers";
import { SpeciesVariantsService } from "../species-variants/species-variants.service";
import { mapPrismaSpeciesVariantToGraphQL } from "../species-variants/utils/species-variant-resolver-mappers";
import { SpeciesService } from "../species/species.service";
import { PendingOwnershipService } from "../pending-ownership/pending-ownership.service";
import { PendingOwnership } from "../pending-ownership/entities/pending-ownership.entity";
import { mapPrismaPendingOwnershipToGraphQL } from "../pending-ownership/utils/pending-ownership-mappers";
import {
  Character as CharacterEntity,
  CharacterConnection,
  CharacterCount,
  CharacterTag,
} from "./entities/character.entity";
import { Media } from "../media/entities/media.entity";
import { ImagesService } from "../images/images.service";
import { User } from "../users/entities/user.entity";
import { SpeciesVariant } from "../species-variants/entities/species-variant.entity";
import { Species } from "../species/entities/species.entity";
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
    private readonly pendingOwnershipService: PendingOwnershipService,
  ) {}

  @AllowAnyAuthenticated()
  @AllowCommunityPermission(CommunityPermission.CanCreateCharacter)
  @ResolveCommunityFrom({ speciesId: "input.speciesId" })
  @Mutation(() => CharacterEntity)
  async createCharacter(
    @Args("input") input: CreateCharacterInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ) {
    // Require speciesId for all character creation
    if (!input.speciesId) {
      throw new BadRequestException(
        "Non-species character creation coming soon to all users!",
      );
    }

    // If creating orphaned character (with pending ownership or leave unassigned), require canCreateOrphanedCharacter permission
    if (input.pendingOwner || input.assignToSelf === false) {
      // Check permissions
      const hasPermission =
        await this.charactersService.userHasOrphanedCharacterPermission(
          user.id,
          input.speciesId,
        );
      if (!hasPermission) {
        throw new ForbiddenException(
          "You do not have permission to create orphaned characters",
        );
      }
    }

    const serviceInput = mapCreateCharacterInputToService(input);
    const character = await this.charactersService.create(
      user.id, // Creator is always the current user
      serviceInput, // ownerId comes from serviceInput (null for orphaned)
    );
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterConnection)
  async characters(
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ) {
    const result = await this.charactersService.findAll(filters, user?.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterEntity)
  async character(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<CharacterEntity> {
    const character = await this.charactersService.findOne(id, user?.id);
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
  @Mutation(() => CharacterEntity)
  async updateCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateCharacterInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    // If updating ownership or pending ownership, require canCreateOrphanedCharacter permission
    if (input.ownerIdUpdate !== undefined || input.pendingOwnerUpdate !== undefined) {
      let speciesId = input.speciesId;

      // If speciesId not in input, fetch from existing character
      if (!speciesId) {
        const char = await this.charactersService.findOne(id, user.id);
        speciesId = char.speciesId ?? undefined;
      }

      // Validate that character has a species
      if (!speciesId) {
        throw new BadRequestException(
          'Cannot manage ownership on a character without a species',
        );
      }

      // Check permissions
      const hasPermission =
        await this.charactersService.userHasOrphanedCharacterPermission(
          user.id,
          speciesId,
        );
      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to manage character ownership',
        );
      }
    }

    const serviceInput = mapUpdateCharacterInputToService(input);
    const character = await this.charactersService.update(
      id,
      user.id,
      serviceInput,
    );
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
  @Mutation(() => Boolean)
  async deleteCharacter(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.charactersService.remove(id, user.id);
  }

  @AllowEntityOwner({ characterId: "id" })
  @Mutation(() => CharacterEntity)
  async transferCharacter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: TransferCharacterInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    await this.charactersService.transfer(id, user.id, input.newOwnerId);
    const char = await this.charactersService.findOne(id, user.id);
    return mapPrismaCharacterToGraphQL(char);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
  @Mutation(() => CharacterEntity)
  async addCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    await this.charactersService.addTags(id, user.id, input.tagNames);
    const char = await this.charactersService.findOne(id, user.id);
    return mapPrismaCharacterToGraphQL(char);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
  @Mutation(() => CharacterEntity)
  async removeCharacterTags(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: ManageTagsInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    await this.charactersService.removeTags(id, user.id, input.tagNames);
    const char = await this.charactersService.findOne(id, user.id);
    return mapPrismaCharacterToGraphQL(char);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
  @Mutation(() => CharacterEntity, {
    description: "Sets or clears the main media for a character",
  })
  async setCharacterMainMedia(
    @Args("id", { type: () => ID, description: "Character ID to update" })
    id: string,
    @Args("input", { description: "Main media setting parameters" })
    input: SetMainMediaInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    await this.charactersService.setMainMedia(id, user.id, input.mediaId);
    const char = await this.charactersService.findOne(id, user.id);
    return mapPrismaCharacterToGraphQL(char);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterConnection)
  async myCharacters(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<CharacterConnection> {
    const userFilters = { ...filters, ownerId: user.id };
    const result = await this.charactersService.findAll(userFilters, user.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterConnection)
  async myEditableCharacters(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<CharacterConnection> {
    const result = await this.charactersService.findEditableCharacters(user.id, filters);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterConnection, {
    description: "Get characters the current user can upload images to",
  })
  async myCharactersForImageUpload(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
  ): Promise<CharacterConnection> {
    const result = await this.charactersService.findCharactersForImageUpload(user.id, filters);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  @AllowUnauthenticated()
  @Query(() => CharacterConnection)
  async userCharacters(
    @Args("userId", { type: () => ID }) userId: string,
    @Args("filters", { nullable: true }) filters?: CharacterFiltersInput,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<CharacterConnection> {
    const userFilters = { ...filters, ownerId: userId };
    const result = await this.charactersService.findAll(userFilters, user?.id);
    return mapPrismaCharacterConnectionToGraphQL(result);
  }

  // Field resolver to return displayName values for tags string array
  @AllowUnauthenticated()
  @ResolveField("tags", () => [String])
  async resolveTagsField(
    @Parent() character: CharacterEntity,
  ): Promise<string[]> {
    return this.tagsService.getCharacterTags(character.id);
  }

  @AllowUnauthenticated()
  @ResolveField("isOrphaned", () => Boolean)
  async resolveIsOrphanedField(
    @Parent() character: CharacterEntity,
  ): Promise<boolean> {
    return character.ownerId === null || character.ownerId === undefined;
  }

  @AllowUnauthenticated()
  @ResolveField("likesCount", () => Int)
  async resolveLikesCountField(
    @Parent() character: CharacterEntity,
  ): Promise<number> {
    const count = await this.charactersService.getLikesCount(character.id);
    return count;
  }

  @AllowAnyAuthenticated()
  @ResolveField("userHasLiked", () => Boolean)
  async resolveUserHasLikedField(
    @Parent() character: CharacterEntity,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    return this.charactersService.hasUserLiked(character.id, user.id);
  }

  /** Character count field resolver */
  @AllowUnauthenticated()
  @ResolveField("_count", () => CharacterCount)
  async resolveCountField(
    @Parent() character: CharacterEntity,
  ): Promise<CharacterCount> {
    const mediaCount = await this.mediaService.getCharacterMediaCount(
      character.id,
    );
    return { media: mediaCount };
  }

  /** Character creator field resolver */
  @AllowUnauthenticated()
  @ResolveField("creator", () => User, { nullable: true })
  async resolveCreatorField(
    @Parent() character: CharacterEntity,
  ): Promise<User | null> {
    if (!character.creatorId) return null;
    const user = await this.usersService.findById(character.creatorId);
    return user ? mapPrismaUserToGraphQL(user) : null;
  }

  /** Character owner field resolver */
  @AllowUnauthenticated()
  @ResolveField("owner", () => User, { nullable: true })
  async resolveOwnerField(
    @Parent() character: CharacterEntity,
  ): Promise<User | null> {
    if (!character.ownerId) return null; // Orphaned character
    const user = await this.usersService.findById(character.ownerId);
    if (!user) throw new Error("Owner not found");
    return mapPrismaUserToGraphQL(user);
  }

  /** Pending ownership field resolver */
  @AllowUnauthenticated()
  @ResolveField("pendingOwnership", () => PendingOwnership, { nullable: true })
  async resolvePendingOwnershipField(
    @Parent() character: CharacterEntity,
  ): Promise<PendingOwnership | null> {
    const pending = await this.pendingOwnershipService.findByCharacterId(
      character.id,
    );
    // Only return unclaimed pending ownerships
    return pending && !pending.claimedAt
      ? mapPrismaPendingOwnershipToGraphQL(pending)
      : null;
  }

  /** Main media field resolver */
  @AllowUnauthenticated()
  @ResolveField("mainMedia", () => Media, {
    nullable: true,
    description: "Main media item for this character (image or text)",
  })
  async resolveMainMediaField(
    @Parent() character: CharacterEntity,
  ): Promise<Media | null> {
    if (!character.mainMediaId) return null;
    const media = await this.mediaService.findOne(character.mainMediaId);
    return media ? mapPrismaMediaToGraphQL(media) : null;
  }

  /** Character tags relation field resolver */
  @AllowUnauthenticated()
  @ResolveField("tags_rel", () => [CharacterTag])
  async resolveTagsRelField(
    @Parent() character: CharacterEntity,
  ): Promise<CharacterTag[]> {
    const tags = await this.tagsService.getCharacterTagRelations(character.id);
    return tags.map((tag) => ({
      character,
      tag: {
        ...tag,
        category: tag.category ?? undefined,
        color: tag.color ?? undefined,
      },
    }));
  }

  /** Species field resolver */
  @AllowUnauthenticated()
  @ResolveField("species", () => Species, {
    nullable: true,
    description: "Species this character belongs to",
  })
  async resolveSpeciesField(
    @Parent() character: CharacterEntity,
  ): Promise<Species | null> {
    if (!character.speciesId) return null;
    return this.speciesService.findOne(character.speciesId);
  }

  /** Species variant field resolver */
  @AllowUnauthenticated()
  @ResolveField("speciesVariant", () => SpeciesVariant, {
    nullable: true,
    description: "Species variant this character belongs to",
  })
  async resolveSpeciesVariantField(
    @Parent() character: CharacterEntity,
  ): Promise<SpeciesVariant | null> {
    if (!character.speciesVariantId) return null;
    const prismaResult = await this.speciesVariantsService.findOne(
      character.speciesVariantId,
    );
    return mapPrismaSpeciesVariantToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @AllowCharacterEditor({ characterId: "id" })
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
