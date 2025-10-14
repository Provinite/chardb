import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  Int,
  ResolveField,
  Parent,
} from "@nestjs/graphql";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { CharacterOwnershipChangesService } from "./character-ownership-changes.service";
import { AllowGlobalAdmin } from "../auth/decorators/AllowGlobalAdmin";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { CurrentUser, CurrentUserType } from "../auth/decorators/CurrentUser";
import { PermissionService } from "../auth/PermissionService";
import { GlobalPermission } from "../auth/GlobalPermission";
import {
  CharacterOwnershipChange,
  CharacterOwnershipChangeConnection,
} from "./entities/character-ownership-change.entity";
import { CreateCharacterOwnershipChangeInput } from "./dto/character-ownership-change.dto";
import { RemovalResponse } from "../shared/entities/removal-response.entity";
import { User } from "../users/entities/user.entity";
import { Character } from "../characters/entities/character.entity";
import {
  mapCreateCharacterOwnershipChangeInputToService,
  mapPrismaCharacterOwnershipChangeToGraphQL,
  mapPrismaCharacterOwnershipChangeConnectionToGraphQL,
} from "./utils/character-ownership-change-resolver-mappers";
import { UsersService } from "../users/users.service";
import { CharactersService } from "../characters/characters.service";
import { mapPrismaUserToGraphQL } from "../users/utils/user-resolver-mappers";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";

@Resolver(() => CharacterOwnershipChange)
export class CharacterOwnershipChangesResolver {
  constructor(
    private readonly characterOwnershipChangesService: CharacterOwnershipChangesService,
    private readonly usersService: UsersService,
    private readonly charactersService: CharactersService,
    private readonly permissionService: PermissionService,
  ) {}

  @AllowGlobalAdmin()
  @Mutation(() => CharacterOwnershipChange, {
    description: "Create a new character ownership change record",
  })
  async createCharacterOwnershipChange(
    @Args("createCharacterOwnershipChangeInput", {
      description: "Character ownership change creation data",
    })
    createCharacterOwnershipChangeInput: CreateCharacterOwnershipChangeInput,
  ): Promise<CharacterOwnershipChange> {
    const serviceInput = mapCreateCharacterOwnershipChangeInputToService(
      createCharacterOwnershipChangeInput,
    );
    const prismaResult =
      await this.characterOwnershipChangesService.create(serviceInput);
    return mapPrismaCharacterOwnershipChangeToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @Query(() => CharacterOwnershipChangeConnection, {
    name: "characterOwnershipChanges",
    description: "Get all character ownership changes with pagination",
  })
  async findAll(
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of ownership changes to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CharacterOwnershipChangeConnection> {
    const serviceResult = await this.characterOwnershipChangesService.findAll({
      first,
      after,
    });
    return mapPrismaCharacterOwnershipChangeConnectionToGraphQL(serviceResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterOwnershipChangeConnection, {
    name: "characterOwnershipChangesByCharacter",
    description:
      "Get character ownership changes by character ID with pagination",
  })
  async findByCharacter(
    @Args("characterId", { type: () => ID, description: "Character ID" })
    characterId: string,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of ownership changes to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
  ): Promise<CharacterOwnershipChangeConnection> {
    const serviceResult =
      await this.characterOwnershipChangesService.findByCharacter({
        characterId,
        first,
        after,
      });
    return mapPrismaCharacterOwnershipChangeConnectionToGraphQL(serviceResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterOwnershipChangeConnection, {
    name: "characterOwnershipChangesByUser",
    description: "Get character ownership changes by user ID with pagination",
  })
  async findByUser(
    @Args("userId", {
      type: () => ID,
      description: "User ID (can be from or to user)",
    })
    userId: string,
    @Args("first", {
      type: () => Int,
      nullable: true,
      description: "Number of ownership changes to return",
      defaultValue: 20,
    })
    first?: number,
    @Args("after", {
      type: () => String,
      nullable: true,
      description: "Cursor for pagination",
    })
    after?: string,
    @CurrentUser() currentUser?: CurrentUserType,
  ): Promise<CharacterOwnershipChangeConnection> {
    // Check authorization: self OR admin
    if (!currentUser) {
      throw new ForbiddenException("Authentication required");
    }

    const isSelf = this.permissionService.isSelf(currentUser.id, userId);
    const isAdmin = this.permissionService.hasGlobalPermission(
      currentUser,
      GlobalPermission.IsAdmin
    );

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException(
        "You can only view your own ownership changes"
      );
    }

    const serviceResult =
      await this.characterOwnershipChangesService.findByUser({
        userId,
        first,
        after,
      });
    return mapPrismaCharacterOwnershipChangeConnectionToGraphQL(serviceResult);
  }

  @AllowAnyAuthenticated()
  @Query(() => CharacterOwnershipChange, {
    name: "characterOwnershipChangeById",
    description: "Get a character ownership change by ID",
  })
  async findOne(
    @Args("id", {
      type: () => ID,
      description: "Character ownership change ID",
    })
    id: string,
  ): Promise<CharacterOwnershipChange> {
    const prismaResult =
      await this.characterOwnershipChangesService.findOne(id);
    return mapPrismaCharacterOwnershipChangeToGraphQL(prismaResult);
  }

  @AllowGlobalAdmin()
  @Mutation(() => RemovalResponse, {
    description: "Remove a character ownership change record",
  })
  async removeCharacterOwnershipChange(
    @Args("id", {
      type: () => ID,
      description: "Character ownership change ID",
    })
    id: string,
  ): Promise<RemovalResponse> {
    await this.characterOwnershipChangesService.remove(id);
    return {
      removed: true,
      message: "Character ownership change successfully deleted",
    };
  }

  // Field resolvers for relations
  @ResolveField("character", () => Character)
  async resolveCharacter(
    @Parent() ownershipChange: CharacterOwnershipChange,
  ): Promise<Character> {
    const prismaCharacter = await this.charactersService.findOne(
      ownershipChange.characterId,
    );
    return mapPrismaCharacterToGraphQL(prismaCharacter);
  }

  @ResolveField("fromUser", () => User, { nullable: true })
  async resolveFromUser(
    @Parent() ownershipChange: CharacterOwnershipChange,
  ): Promise<User | null> {
    if (!ownershipChange.fromUserId) return null;

    const prismaUser = await this.usersService.findById(
      ownershipChange.fromUserId,
    );
    if (!prismaUser) {
      throw new NotFoundException(
        `User with ID ${ownershipChange.fromUserId} not found`,
      );
    }
    return mapPrismaUserToGraphQL(prismaUser);
  }

  @ResolveField("toUser", () => User)
  async resolveToUser(
    @Parent() ownershipChange: CharacterOwnershipChange,
  ): Promise<User> {
    const prismaUser = await this.usersService.findById(
      ownershipChange.toUserId,
    );
    if (!prismaUser) {
      throw new NotFoundException(
        `User with ID ${ownershipChange.toUserId} not found`,
      );
    }
    return mapPrismaUserToGraphQL(prismaUser);
  }
}
