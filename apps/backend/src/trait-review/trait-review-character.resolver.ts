import { Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { Character } from "../characters/entities/character.entity";
import { TraitReview } from "./entities/trait-review.entity";
import { TraitReviewService } from "./trait-review.service";
import { TraitReviewSource } from "@chardb/database";
import { AllowUnauthenticated } from "../auth/decorators/AllowUnauthenticated";
import { mapPrismaTraitReviewToGraphQL } from "./utils/trait-review-mappers";

@Resolver(() => Character)
export class TraitReviewCharacterResolver {
  constructor(private readonly traitReviewService: TraitReviewService) {}

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
