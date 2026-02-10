import type { MappingConfig, CompositeRule } from "../types/mapping-config";
import type { MappedTrait } from "../types/parsed-character";
import { extractTraitAndRarity } from "./trait-extractor";

export interface TraitMappingResult {
  mappedTraits: MappedTrait[];
  unmappedLines: string[];
  warnings: string[];
}

function matchesIgnorePattern(
  line: string,
  ignorePatterns: string[]
): boolean {
  for (const pattern of ignorePatterns) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(line)) {
      return true;
    }
  }
  return false;
}

function tryCompositeRules(
  line: string,
  compositeRules: CompositeRule[]
): MappedTrait[] | null {
  for (const rule of compositeRules) {
    const regex = new RegExp(rule.linePattern, "i");
    const match = line.match(regex);
    if (match) {
      return rule.extractions.map((ext) => ({
        traitId: ext.traitId,
        enumValueId: ext.enumValueId,
        rarity: ext.rarity,
        sourceLine: line,
      }));
    }
  }
  return null;
}

export function mapTraitLines(
  lines: string[],
  config: MappingConfig
): TraitMappingResult {
  const mappedTraits: MappedTrait[] = [];
  const unmappedLines: string[] = [];
  const warnings: string[] = [];

  // Build a case-insensitive lookup map for simple rules
  const ruleLookup = new Map<string, { traitId: string; enumValueId: string }>();
  for (const rule of config.rules) {
    ruleLookup.set(rule.pattern.toLowerCase(), {
      traitId: rule.traitId,
      enumValueId: rule.enumValueId,
    });
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check ignore patterns
    if (matchesIgnorePattern(trimmed, config.ignorePatterns)) {
      continue;
    }

    // Try composite rules first
    const compositeMatch = tryCompositeRules(trimmed, config.compositeRules);
    if (compositeMatch) {
      mappedTraits.push(...compositeMatch);
      continue;
    }

    // Extract rarity and trait text
    const { rarity, traitText } = extractTraitAndRarity(trimmed);

    // Look up in simple rules
    const match = ruleLookup.get(traitText.toLowerCase());
    if (match) {
      mappedTraits.push({
        traitId: match.traitId,
        enumValueId: match.enumValueId,
        rarity: rarity ?? undefined,
        sourceLine: trimmed,
      });
    } else {
      unmappedLines.push(trimmed);
      warnings.push(`Unmapped trait line: "${trimmed}"`);
    }
  }

  return { mappedTraits, unmappedLines, warnings };
}

/**
 * Derive the variant ID based on the highest rarity among mapped traits.
 */
export function deriveVariant(
  mappedTraits: MappedTrait[],
  config: MappingConfig
): { variantId: string | null; rarity: string | null } {
  let highestRarityIndex = -1;
  let highestRarity: string | null = null;

  for (const trait of mappedTraits) {
    if (trait.rarity) {
      const idx = config.rarityOrder.indexOf(trait.rarity);
      if (idx > highestRarityIndex) {
        highestRarityIndex = idx;
        highestRarity = trait.rarity;
      }
    }
  }

  if (highestRarity && config.rarityToVariantId[highestRarity]) {
    return {
      variantId: config.rarityToVariantId[highestRarity],
      rarity: highestRarity,
    };
  }

  // Default to first rarity if no traits have rarity
  const defaultRarity = config.rarityOrder[0];
  if (defaultRarity && config.rarityToVariantId[defaultRarity]) {
    return {
      variantId: config.rarityToVariantId[defaultRarity],
      rarity: defaultRarity,
    };
  }

  return { variantId: null, rarity: null };
}
