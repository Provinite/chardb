import type { HalloweenPrize } from "@chardb/database";

/**
 * A markdown link to what the prize hands over on chardb, or undefined for a
 * prize that is delivered by hand.
 */
export function formatChardbLink(
  prize: Pick<HalloweenPrize, "itemTypeId" | "characterId">,
): string | undefined {
  if (prize.itemTypeId) {
    return `[View on CharDB](https://chardb.cc/item/${prize.itemTypeId})`;
  }
  if (prize.characterId) {
    return `[View on CharDB](https://chardb.cc/character/${prize.characterId})`;
  }
  return undefined;
}
