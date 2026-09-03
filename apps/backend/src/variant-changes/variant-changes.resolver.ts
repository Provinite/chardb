import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { Character } from "../characters/entities/character.entity";
import { mapPrismaCharacterToGraphQL } from "../characters/utils/character-resolver-mappers";
import { VariantChangesService } from "./variant-changes.service";
import { ChangeCharacterVariantWithItemInput } from "./dto/variant-change.dto";

@Resolver()
export class VariantChangesResolver {
  constructor(private readonly variantChanges: VariantChangesService) {}

  /**
   * `@AllowAnyAuthenticated` and nothing else, on purpose.
   *
   * There is no `@AllowCommunityPermission` here because the item is the
   * permission. Changing a variant otherwise needs
   * `canEditCharacterRegistry`, which is staff-only by design -- requiring it
   * would make these items worthless to exactly the members they are sold to.
   *
   * The checks standing in for a permission all live in the service, before or
   * inside the transaction: the item must be a consumable variant-change item
   * still held by this caller, the character must be theirs, the grant must
   * cover that character's species and current variant, the character must not
   * already be the destination, the caller must be a member of the community,
   * and the character must have nothing awaiting review.
   *
   * Returns the **character**, unlike the other two redemptions, because
   * unlike them the change has already happened. There is no review to hand
   * back and nothing provisional to warn about.
   */
  @AllowAnyAuthenticated()
  @Mutation(() => Character, {
    description:
      "Redeem an item to move one of your characters to the variant that " +
      "item grants. Destroys the item and applies the change immediately -- " +
      "there is no review. Authorized by holding the item, not by " +
      "canEditCharacterRegistry.",
  })
  async changeCharacterVariantWithItem(
    @Args("input") input: ChangeCharacterVariantWithItemInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<Character> {
    const character = await this.variantChanges.spendItem(user.id, input);
    return mapPrismaCharacterToGraphQL(character);
  }
}
