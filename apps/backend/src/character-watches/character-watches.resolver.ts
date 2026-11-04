import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { Character } from "../characters/entities/character.entity";
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
  @Mutation(() => Boolean, {
    description:
      "Be notified when this character's availability flags or price change. " +
      "Answers true, the new value of viewerIsWatching.",
  })
  async watchCharacter(
    @Args("characterId", { type: () => ID }) characterId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    await this.watches.watch(user.id, characterId);
    return true;
  }

  @AllowAnyAuthenticated()
  @Mutation(() => Boolean, {
    description:
      "Stop being notified about this character, even one you can no " +
      "longer see. Answers false, the new value of viewerIsWatching.",
  })
  async unwatchCharacter(
    @Args("characterId", { type: () => ID }) characterId: string,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<boolean> {
    await this.watches.unwatch(user.id, characterId);
    return false;
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
