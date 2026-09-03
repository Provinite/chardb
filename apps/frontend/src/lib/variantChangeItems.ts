/**
 * Whether a variant change grant covers a character.
 *
 * The client's copy of `ItemsService.variantChangeGrantCovers`. Duplicated
 * deliberately rather than shared, for the reason `kitCovers` gives: the
 * server's is the one that decides, and this one only decides whether to
 * *offer* the item.
 *
 * An empty source list covers every variant of the species, **including a
 * character with no variant set at all** — the case a naive `includes` gets
 * wrong by omission.
 *
 * Says nothing about whether the character is already the destination. That is
 * a separate refusal with its own sentence; see {@link alreadyThere}.
 */
export function variantItemCovers(
  grant: {
    species: { id: string };
    fromVariants: ReadonlyArray<{ id: string }>;
  },
  character: {
    speciesId?: string | null;
    speciesVariantId?: string | null;
  },
): boolean {
  if (!character.speciesId) return false;
  if (character.speciesId !== grant.species.id) return false;

  if (grant.fromVariants.length === 0) return true;

  return grant.fromVariants.some((v) => v.id === character.speciesVariantId);
}

/** Whether redeeming would move the character to where it already is. */
export function alreadyThere(
  grant: { toVariant: { id: string } },
  character: { speciesVariantId?: string | null },
): boolean {
  return character.speciesVariantId === grant.toVariant.id;
}

/** Whether an item can be offered on this character at all. */
export function variantItemUsableOn(
  grant: {
    species: { id: string };
    toVariant: { id: string };
    fromVariants: ReadonlyArray<{ id: string }>;
  },
  character: {
    speciesId?: string | null;
    speciesVariantId?: string | null;
  },
): boolean {
  return variantItemCovers(grant, character) && !alreadyThere(grant, character);
}

export interface StrandedValue {
  /** Index into the trait value list, so a replacement can be written back. */
  index: number;
  traitId: string;
  traitName: string;
  /** What the value is now, named. */
  optionName: string;
}

/**
 * Which of a character's trait values the destination variant does not permit.
 *
 * A variant is an allow-list. Moving a character to one that does not permit a
 * marking it currently has would leave it holding a value its own editor
 * cannot offer, so those values have to be re-picked before the redemption is
 * allowed — which is the one piece of work this page exists to make possible.
 *
 * **An allow-list with no rows permits nothing.** A variant with no enum
 * settings is not "unconfigured, so anything goes"; it is a variant nothing
 * can be, the same way a variant with no trait-list entries carries no traits.
 * `CharactersService.enumValueViolationsForVariant` reads it that way and will
 * refuse every enum value, so reading it the other way here would show a page
 * with nothing to re-pick and then fail at submit.
 *
 * Only string values can name an enum option; a numeric or free-text trait has
 * no options and so cannot be stranded.
 */
export function strandedValues(
  traitValues: ReadonlyArray<{ traitId: string; value?: unknown }>,
  allowedEnumValueIds: ReadonlySet<string>,
  optionsById: ReadonlyMap<
    string,
    { id: string; name: string; traitId: string; traitName: string }
  >,
): StrandedValue[] {
  return traitValues
    .map((tv, index) => ({
      index,
      option:
        typeof tv.value === "string" ? optionsById.get(tv.value) : undefined,
    }))
    .filter(
      (row): row is { index: number; option: { id: string; name: string; traitId: string; traitName: string } } =>
        row.option !== undefined && !allowedEnumValueIds.has(row.option.id),
    )
    .map(({ index, option }) => ({
      index,
      traitId: option.traitId,
      traitName: option.traitName,
      optionName: option.name,
    }));
}
