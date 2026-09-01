/**
 * Whether an edit kit's grant covers a character.
 *
 * The client's copy of `ItemsService.traitEditGrantCovers`. Duplicated
 * deliberately rather than shared: the server's is the one that decides, and
 * this one only decides whether to *offer* the kit. A drift between them shows
 * up as an offer the server refuses, which is visible and fixable; sharing the
 * rule through a package would make the offer authoritative-looking without
 * making it authoritative.
 *
 * A species listed with no variants covers every variant of it, **including a
 * character with no variant set at all**. That last case is the one a naive
 * `includes` gets wrong by omission, which is why it is a branch rather than a
 * falsy comparison.
 */
export function kitCovers(
  grant: {
    species: ReadonlyArray<{
      species: { id: string };
      variants: ReadonlyArray<{ id: string }>;
    }>;
  },
  character: {
    speciesId?: string | null;
    speciesVariantId?: string | null;
  },
): boolean {
  if (!character.speciesId) return false;

  const entry = grant.species.find(
    (s) => s.species.id === character.speciesId,
  );
  if (!entry) return false;

  if (entry.variants.length === 0) return true;

  return entry.variants.some((v) => v.id === character.speciesVariantId);
}
