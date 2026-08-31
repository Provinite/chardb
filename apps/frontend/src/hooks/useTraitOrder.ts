import { useMemo } from "react";
import { useTraitsBySpeciesQuery } from "../generated/graphql";
import { buildTraitOrder } from "../lib/traitOrder";

/**
 * The order a species variant puts its traits in.
 *
 * `traitsBySpecies` already sorts by `TraitListEntry.order` when given a
 * variant, so this only has to turn the result into a lookup. Displaying
 * traits is the one thing that needs it — the values themselves are stored in
 * whatever order they were last written, which is nobody's decision.
 *
 * Every component showing a character's traits calls this with the same ids,
 * so Apollo collapses a queue of twenty same-variant characters into one
 * request rather than twenty.
 */

/**
 * Above any real trait list; the edit form asks for 100. A variant with more
 * traits than this would order the first {@link TRAIT_ORDER_PAGE_SIZE} and
 * leave the rest at the end, which is wrong but visible rather than silent.
 */
const TRAIT_ORDER_PAGE_SIZE = 200;

export function useTraitOrder(
  speciesId?: string | null,
  variantId?: string | null,
): { order: Map<string, number>; loading: boolean } {
  const { data, loading } = useTraitsBySpeciesQuery({
    variables: {
      speciesId: speciesId as string,
      variantId,
      first: TRAIT_ORDER_PAGE_SIZE,
    },
    // Without a variant there is no order to speak of: the same trait sits in
    // different places on different variants of one species.
    skip: !speciesId || !variantId,
  });

  const order = useMemo(
    () => buildTraitOrder(data?.traitsBySpecies?.nodes ?? []),
    [data],
  );

  return { order, loading };
}
