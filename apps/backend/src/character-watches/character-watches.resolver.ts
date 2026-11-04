import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Character } from "../characters/entities/character.entity";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import type {
  AuthenticatedCurrentUserType,
  CurrentUserType,
} from "../auth/types/current-user.type";
import { CharacterWatchesService } from "./character-watches.service";

@Resolver(() => Character)
export class CharacterWatchesResolver {
  constructor(private readonly watches: CharacterWatchesService) {}

  @AllowAnyAuthenticated()
  @Mutation(() => Character, {
    description:
      "Be notified when this character's availability flags or price change.",
  })
  async watchCharacter(
    @Args("characterId", { type: () => ID }) characterId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Character> {
    const character = await this.watches.watch(user.id, characterId);
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Character, {
    description: "Stop being notified about this character.",
  })
  async unwatchCharacter(
    @Args("characterId", { type: () => ID }) characterId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Character> {
    const character = await this.watches.unwatch(user.id, characterId);
    return mapPrismaCharacterToGraphQL(character);
  }

  @AllowUnauthenticated()
  @ResolveField(() => Boolean, {
    description:
      "Whether the signed-in member is watching this character. False when " +
      "signed out.",
  })
  async viewerIsWatching(
    @Parent() character: Character,
    @CurrentUser() user?: CurrentUserType,
  ): Promise<boolean> {
    if (!user) return false;
    return this.watches.isWatching(user.id, character.id);
  }
}
