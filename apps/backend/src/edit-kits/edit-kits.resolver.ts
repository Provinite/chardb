import { Resolver, Mutation, Args } from "@nestjs/graphql";
import { CurrentUser } from "../auth/decorators/CurrentUser";
import { AuthenticatedCurrentUserType } from "../auth/types/current-user.type";
import { AllowAnyAuthenticated } from "../auth/decorators/AllowAnyAuthenticated";
import { TraitReview } from "../trait-review/entities/trait-review.entity";
import { mapPrismaTraitReviewToGraphQL } from "../trait-review/utils/trait-review-mappers";
import { EditKitsService } from "./edit-kits.service";
import { EditCharacterTraitsWithKitInput } from "./dto/edit-kit.dto";

@Resolver()
export class EditKitsResolver {
  constructor(private readonly editKits: EditKitsService) {}

  /**
   * `@AllowAnyAuthenticated` and nothing else, on purpose.
   *
   * There is no `@AllowCommunityPermission` here because the kit is the
   * permission. The stock Member role does not carry
   * `canEditOwnCharacterRegistry`, so requiring it would make kits worthless
   * to exactly the members they are sold to.
   *
   * The checks standing in for a permission all live in the service, before or
   * inside the transaction: the item must be a consumable edit kit still held
   * by this caller, the character must be theirs, the kit's grant must cover
   * that character's species and variant, the caller must be a member of the
   * community, and the character must have no change already awaiting review.
   *
   * Returns the **review**, not the character. Nothing has happened to the
   * character yet, and handing one back would invite a caller to read its
   * traits and find the old ones.
   */
  @AllowAnyAuthenticated()
  @Mutation(() => TraitReview, {
    description:
      "Spend an edit kit to propose a change to one of your characters' " +
      "traits. Destroys the kit and creates a pending USER_EDIT review; the " +
      "character is unchanged until staff approve it. Authorized by holding " +
      "the kit, not by canEditOwnCharacterRegistry.",
  })
  async editCharacterTraitsWithKit(
    @Args("input") input: EditCharacterTraitsWithKitInput,
    @CurrentUser() user: AuthenticatedCurrentUserType,
  ): Promise<TraitReview> {
    const review = await this.editKits.spendKit(user.id, input);
    return mapPrismaTraitReviewToGraphQL(review);
  }
}
