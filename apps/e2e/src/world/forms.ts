import type { CharacterFormInput } from "../generated/graphql.js";

/**
 * Helpers for specs that predate character forms.
 *
 * Every form-carrying input takes the character's *complete* form list, and
 * every character in these worlds has exactly one form. That turns what used
 * to be `traitValues: [...]` into a wrapper, and what used to be
 * `character.traitValues` into a reach through `forms[0]` -- neither of which
 * is what the spec is about. Both live here so the specs keep reading as
 * statements about kits, variants and reviews rather than about form shape.
 */

/** A whole form list for a character that has one form. */
export function oneForm(
  traitValues: CharacterFormInput["traitValues"],
  name = "Base",
): CharacterFormInput[] {
  return [{ name, traitValues }];
}

/** The trait values of a character's first form. */
export function baseTraits<T>(subject: {
  forms: ReadonlyArray<{ traitValues: readonly T[] }>;
}): readonly T[] {
  return subject.forms[0]?.traitValues ?? [];
}

/** The trait values of the first form in a review or audit snapshot. */
export function snapshotTraits<T>(
  snapshot: ReadonlyArray<{ traitValues: readonly T[] }>,
): readonly T[] {
  return snapshot[0]?.traitValues ?? [];
}
