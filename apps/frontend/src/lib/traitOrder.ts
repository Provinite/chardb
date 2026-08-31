/**
 * Ordering character traits the way the species variant says they go.
 *
 * A character's trait values are stored as a JSON array, and that array is in
 * the order it was last written — which is an artefact of whoever last saved
 * the character, not a decision anybody made. Staff order traits deliberately,
 * on the variant, through `TraitListEntry.order`; that is the order a reader
 * expects, and the order a masterlist review is conducted in.
 *
 * The ordering lives on the variant rather than on the trait, because the same
 * trait can sit in a different place on two variants of one species.
 */

/**
 * Trait ids in the order the variant puts them, mapped to their position.
 *
 * Built from `traitsBySpecies(variantId:)`, which already returns traits sorted
 * by `TraitListEntry.order` — so position in that array *is* the order, and
 * there is nothing to read off each trait.
 */
export function buildTraitOrder(traits: Array<{ id: string }>) {
  return new Map(traits.map((trait, index) => [trait.id, index]));
}

/**
 * Sort by the variant's order, keeping anything it does not mention.
 *
 * A trait removed from the variant after a character was saved still has a
 * value on that character. It sorts to the end rather than disappearing:
 * dropping it would hide real data at exactly the moment somebody is checking
 * the character against the variant, which is worse than showing it out of
 * place. Several such traits keep their existing relative order.
 *
 * Stable, so an empty or still-loading ordering leaves the list exactly as it
 * came in rather than shuffling it arbitrarily.
 */
export function sortByTraitOrder<T>(
  items: T[],
  getTraitId: (item: T) => string,
  order: Map<string, number>,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aOrder = order.get(getTraitId(a.item)) ?? Infinity;
      const bOrder = order.get(getTraitId(b.item)) ?? Infinity;
      // Index breaks the tie, which is what makes this stable for equal keys
      // and for the whole unordered tail at once.
      return aOrder === bOrder ? a.index - b.index : aOrder - bOrder;
    })
    .map(({ item }) => item);
}
