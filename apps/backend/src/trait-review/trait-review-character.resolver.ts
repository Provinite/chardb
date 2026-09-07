import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { Character } from "../characters/entities/character.entity";
import { TraitReview } from "./entities/trait-review.entity";
import { TraitReviewService } from "./trait-review.service";
import { TraitReviewSource } from "@chardb/database";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { AllowEntityOwner } from "../auth/decorators/AllowEntityOwner";
import { AllowCharacterRegistryEditor } from "../auth/decorators/AllowCharacterRegistryEditor";
import { mapPrismaTraitReviewToGraphQL } from "./utils/trait-review-mappers";

@Resolver(() => Character)
export class TraitReviewCharacterResolver {
  constructor(private readonly traitReviewService: TraitReviewService) {}

  /**
   * The whole pending review, `proposedTraitValues` included.
   *
   * This carried no `@Allow*` at all, so it was forbidden to everyone (#310) --
   * which is why nothing has ever selected it. The fix is not to open it up:
   * for an edit kit those proposed values are the member's *unapproved* design
   * and a character page is public, so `@AllowUnauthenticated()` here would
   * publish work that has not been approved. {@link pendingTraitReviewSource}
   * below is the public, non-revealing answer and stays that way.
   *
   * Gated instead to the people who may act on the review: the character's
   * owner, and staff who can edit its registry. Both decorators read the
   * character off the parent (`$root.id`) because a field resolver has no
   * arguments to name it in.
   */
  @AllowEntityOwner({ characterId: "$root.id" })
  @AllowCharacterRegistryEditor({ characterId: "$root.id" })
  @ResolveField(() => TraitReview, {
    nullable: true,
    description: "The active pending trait review for this character",
  })
  async activeTraitReview(
    @Parent() character: Character,
  ): Promise<TraitReview | null> {
    const review = await this.traitReviewService.getActiveReviewForCharacter(
      character.id,
    );
    if (!review) return null;
    return mapPrismaTraitReviewToGraphQL(review);
  }

  /**
   * What kind of pending review a character has, if any.
   *
   * Deliberately not {@link activeTraitReview}, which carries the review's
   * `proposedTraitValues` -- for an edit kit that is the member's *unapproved*
   * design, and a character page is public. This returns the source and
   * nothing else.
   *
   * The character page needs it because `traitReviewStatus` alone is ambiguous
   * now: for every source but USER_EDIT the traits on screen are the pending
   * ones, and for USER_EDIT they are the approved ones with a change waiting.
   * One badge for both would misdescribe one of them.
   */
  @AllowUnauthenticated()
  @ResolveField(() => TraitReviewSource, {
    nullable: true,
    description:
      "The source of this character's pending trait review, or null when " +
      "there is none. Says what kind of review is open without exposing what " +
      "it proposes.",
  })
  async pendingTraitReviewSource(
    @Parent() character: Character,
  ): Promise<TraitReviewSource | null> {
    const review = await this.traitReviewService.getActiveReviewForCharacter(
      character.id,
    );
    return review?.source ?? null;
  }
}
