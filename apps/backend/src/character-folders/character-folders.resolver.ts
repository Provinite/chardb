import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import {
  AuthenticatedCurrentUserType,
  CurrentUserType,
} from "../auth/types/current-user.type";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import { CharacterFoldersService } from "./character-folders.service";
import { CharacterFolder } from "./entities/character-folder.entity";
import {
  CreateCharacterFolderInput,
  MoveCharacterFolderInput,
  MoveCharactersToFolderInput,
  SetCharacterFoldersInput,
  UpdateCharacterFolderInput,
} from "./dto/character-folder.dto";

/**
 * Folders belong to one person, so every mutation here is scoped to the
 * caller and none of them takes an owner id -- there is no other workspace to
 * ask for. The two reads that name somebody else are queries, and both narrow
 * to what that person made public.
 */
@Resolver(() => CharacterFolder)
export class CharacterFoldersResolver {
  constructor(private readonly folders: CharacterFoldersService) {}

  @AllowAnyAuthenticated()
  @Query(() => [CharacterFolder], {
    description:
      "Your whole workspace, flat. Nesting is in `parentId`; the client " +
      "builds the tree.",
  })
  async myCharacterFolders(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("communityId", {
      type: () => ID,
      nullable: true,
      description:
        "Count only characters in this community. Folders span communities, " +
        "so this narrows the tallies, not the folders -- one holding nothing " +
        "here reports zero rather than disappearing.",
    })
    communityId?: string,
  ): Promise<CharacterFolder[]> {
    return this.folders.listForOwner(user.id, user.id, communityId);
  }

  @AllowUnauthenticated()
  @Query(() => [CharacterFolder], {
    description:
      "How one member's characters are arranged, as far as you may see. " +
      "Private folders and everything nested under them are left out.",
  })
  async userCharacterFolders(
    @Args("userId", { type: () => ID }) userId: string,
    @CurrentUser() user?: CurrentUserType,
    @Args("communityId", { type: () => ID, nullable: true })
    communityId?: string,
  ): Promise<CharacterFolder[]> {
    return this.folders.listForOwner(userId, user?.id, communityId);
  }

  @AllowUnauthenticated()
  @Query(() => [CharacterFolder], {
    description:
      "Where this character's current owner filed it. Empty for an orphaned " +
      "character.",
  })
  async characterFolders(
    @Args("characterId", { type: () => ID }) characterId: string,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<CharacterFolder[]> {
    return this.folders.foldersForCharacter(characterId, user?.id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => CharacterFolder)
  async createCharacterFolder(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: CreateCharacterFolderInput,
  ): Promise<CharacterFolder> {
    return this.folders.create(user.id, input);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => CharacterFolder, {
    description: "Rename a folder, or change whether it is private.",
  })
  async updateCharacterFolder(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: UpdateCharacterFolderInput,
  ): Promise<CharacterFolder> {
    return this.folders.update(user.id, input);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => [CharacterFolder], {
    description:
      "Reparent or reorder a folder. Returns the whole workspace, because " +
      "one move renumbers a sibling group.",
  })
  async moveCharacterFolder(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: MoveCharacterFolderInput,
  ): Promise<CharacterFolder[]> {
    return this.folders.move(user.id, input);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => RemovalResponse, {
    description:
      "Delete a folder and everything nested under it. The characters are " +
      "untouched and reappear at the root.",
  })
  async deleteCharacterFolder(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<RemovalResponse> {
    return this.folders.remove(user.id, id);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Int, {
    description:
      "File characters, unfile them, or move them between folders. Returns " +
      "how many characters were affected.",
  })
  async moveCharactersToFolder(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: MoveCharactersToFolderInput,
  ): Promise<number> {
    return this.folders.moveCharacters(user.id, input);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => [CharacterFolder], {
    description:
      "Replace the set of folders one character is in. Returns where it ends " +
      "up.",
  })
  async setCharacterFolders(
    @CurrentUser() user: AuthenticatedCurrentUserType,
    @Args("input") input: SetCharacterFoldersInput,
  ): Promise<CharacterFolder[]> {
    return this.folders.setCharacterFolders(user.id, input);
  }
}
