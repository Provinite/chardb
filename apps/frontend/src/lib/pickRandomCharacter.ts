export interface CharacterAtOffset {
  /** The character at the requested offset, or null past the end. */
  id: string | null;
  /** How many characters match right now. */
  total: number;
}

const randomOffset = (total: number, random: () => number) =>
  Math.min(total - 1, Math.floor(random() * total));

/**
 * Choose one character uniformly from every match, not just the loaded page.
 *
 * `total` comes from the listing, which can be stale by the time the button
 * is pressed: if characters went away since, the offset can land past the
 * end. The miss carries the current total, so one more pick against it
 * settles it.
 */
export const pickRandomCharacterId = async (
  fetchAt: (offset: number) => Promise<CharacterAtOffset>,
  total: number,
  random: () => number = Math.random,
): Promise<string | null> => {
  if (total <= 0) return null;

  const first = await fetchAt(randomOffset(total, random));
  if (first.id) return first.id;
  if (first.total <= 0) return null;

  const second = await fetchAt(randomOffset(first.total, random));
  return second.id;
};
