import { TraitReviewSource } from "../generated/graphql";

/**
 * Whether a review is one a member paid for with an item.
 *
 * MYO redemptions and edit-kit changes both destroy an item before the review
 * exists. That single fact is why they behave differently from the others in
 * three places at once: refusing them returns the item, deleting the character
 * out from under them strands it, and "Revert" is the wrong word for what
 * refusing them does.
 *
 * One predicate rather than the same two-way comparison at each of those
 * sites, because the next source added is the one that gets it wrong in
 * exactly one of them.
 */
export const isRedemptionReview = (
  source: TraitReviewSource | null | undefined,
): boolean =>
  source === TraitReviewSource.Myo || source === TraitReviewSource.UserEdit;
