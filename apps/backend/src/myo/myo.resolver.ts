import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { Character as CharacterEntity } from "../characters/entities/character.entity";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { MyoService } from "./myo.service";
import { RedeemMyoTicketInput } from "./dto/myo.dto";

@Resolver()
export class MyoResolver {
  constructor(private readonly myoService: MyoService) {}

  /**
   * `@AllowAnyAuthenticated` and nothing else, on purpose.
   *
   * There is no `@AllowCommunityPermission` here because the ticket is the
   * permission -- a member who could already create characters has no need of
   * one. The checks that stand in for a permission are all in the service, and
   * all inside or before the transaction: the item must exist, be consumable,
   * carry an MYO grant, still be held by this caller, and the caller must be a
   * member of the community the species belongs to.
   *
   * Adding a community permission here would make tickets worthless to
   * exactly the members they are issued to. There is an e2e spec that strips
   * `canCreateCharacter` and redeems anyway, so that change fails loudly.
   *
   * `@ResolveCommunityFrom` is likewise absent: the community is not an
   * argument here, it is whatever the ticket says, and letting a caller name
   * one would be the hole this mutation exists to avoid.
   */
  @AllowAnyAuthenticated()
  @Mutation(() => CharacterEntity, {
    description:
      "Spend an MYO ticket to make a character. Destroys the ticket and " +
      "creates the character with its traits pending review. Authorized by " +
      "holding the ticket, not by canCreateCharacter.",
  })
  async createCharacterFromMyoTicket(
    @Args("input") input: RedeemMyoTicketInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<CharacterEntity> {
    const character = await this.myoService.redeemTicket(user.id, input);
    return mapPrismaCharacterToGraphQL(character);
  }
}
