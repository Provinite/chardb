export interface ExtractedTrait {
  rawLine: string;
  rarity: string | null;
  traitText: string;
}

const RARITY_PREFIXES = [
  "Exclusive",
  "Legendary",
  "Very Rare",
  "Special",
  "Rare",
  "Uncommon",
  "Common",
];

/**
 * Strip a rarity prefix from a trait line and return both the rarity and the remaining text.
 */
export function extractTraitAndRarity(line: string): ExtractedTrait {
  const trimmed = line.trim();

  for (const rarity of RARITY_PREFIXES) {
    const regex = new RegExp(`^${rarity}\\s+`, "i");
    if (regex.test(trimmed)) {
      return {
        rawLine: trimmed,
        rarity,
        traitText: trimmed.replace(regex, "").trim(),
      };
    }
  }

  return {
    rawLine: trimmed,
    rarity: null,
    traitText: trimmed,
  };
}
