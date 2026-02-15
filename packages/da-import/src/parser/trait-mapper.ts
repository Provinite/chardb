import type { MappingConfig, CompositeRule } from "../types/mapping-config";
import type { MappedTrait } from "../types/parsed-character";
import { extractTraitAndRarity } from "./trait-extractor";

export interface TraitMappingResult {
  mappedTraits: MappedTrait[];
  unmappedLines: string[];
  warnings: string[];
}

/**
 * Strip a trailing parenthetical like "(Bell Collar)" from a trait text.
 */
function stripParenthetical(text: string): string {
  return text.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/**
 * Look up a trait text in the rule map, falling back to stripping
 * a trailing parenthetical modifier if the exact text doesn't match.
 */
function lookupRule(
  traitText: string,
  ruleLookup: Map<string, { traitId: string; enumValueId: string }>
): { traitId: string; enumValueId: string } | undefined {
  const exact = ruleLookup.get(traitText.toLowerCase());
  if (exact) return exact;

  const stripped = stripParenthetical(traitText);
  if (stripped !== traitText) {
    return ruleLookup.get(stripped.toLowerCase());
  }
  return undefined;
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

interface CompositeResult {
  traits: MappedTrait[];
  errors: string[];
}

function tryCompositeRules(
  line: string,
  compositeRules: CompositeRule[],
  ruleLookup: Map<string, { traitId: string; enumValueId: string }>
): CompositeResult | null {
  for (const rule of compositeRules) {
    const regex = new RegExp(rule.linePattern, "i");
    const match = line.match(regex);
    if (!match) continue;

    // If extractions are defined, use them directly
    if (rule.extractions.length > 0) {
      return {
        traits: rule.extractions.map((ext) => ({
          traitId: ext.traitId,
          enumValueId: ext.enumValueId,
          rarity: ext.rarity,
          sourceLine: line,
        })),
        errors: [],
      };
    }

    // Empty extractions: split capture groups into sub-lines and re-lookup
    const results: MappedTrait[] = [];
    const failedGroups: string[] = [];
    for (let i = 1; i < match.length; i++) {
      const subLine = match[i]?.trim();
      if (!subLine) continue;
      const { rarity, traitText } = extractTraitAndRarity(subLine);
      const found = lookupRule(traitText, ruleLookup);
      if (found) {
        results.push({
          traitId: found.traitId,
          enumValueId: found.enumValueId,
          rarity: rarity ?? undefined,
          sourceLine: line,
        });
      } else {
        failedGroups.push(subLine);
      }
    }
    if (results.length > 0) {
      const errors: string[] = [];
      if (failedGroups.length > 0) {
        errors.push(
          `Composite rule matched line "${line}" but ${failedGroups.length} capture group(s) failed to resolve: ${failedGroups.map((g) => `"${g}"`).join(", ")}`
        );
      }
      return { traits: results, errors };
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
  const captureGroupErrors: string[] = [];

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
    const compositeMatch = tryCompositeRules(trimmed, config.compositeRules, ruleLookup);
    if (compositeMatch) {
      mappedTraits.push(...compositeMatch.traits);
      captureGroupErrors.push(...compositeMatch.errors);
      continue;
    }

    // Extract rarity and trait text
    const { rarity, traitText } = extractTraitAndRarity(trimmed);

    // Look up in simple rules (with parenthetical stripping fallback)
    const match = lookupRule(traitText, ruleLookup);
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

  if (captureGroupErrors.length > 0) {
    for (const err of captureGroupErrors) {
      warnings.push(err);
    }
  }

  return { mappedTraits, unmappedLines, warnings };
}

export interface VariantSetting {
  id: string;
  name: string;
  allowedEnumValueIds: string[];
}

/**
 * Derive the variant by selecting the LOWEST rarity variant that has ALL
 * selected enum values enabled. Falls back to the highest rarity variant
 * if no variant allows all selected enum values.
 */
export function deriveVariant(
  mappedTraits: MappedTrait[],
  config: MappingConfig,
  variantSettings: VariantSetting[]
): { variantId: string | null; rarity: string | null } {
  const selectedEnumValues = new Set<string>();
  for (const trait of mappedTraits) {
    if ("enumValueId" in trait) {
      selectedEnumValues.add(trait.enumValueId);
    }
  }

  const variantAllowed = new Map<string, Set<string>>();
  for (const v of variantSettings) {
    variantAllowed.set(v.id, new Set(v.allowedEnumValueIds));
  }

  // Iterate from lowest to highest rarity; return first that allows all
  for (const rarity of config.rarityOrder) {
    const variantId = config.rarityToVariantId[rarity];
    if (!variantId) continue;
    const allowed = variantAllowed.get(variantId);
    if (!allowed) continue;

    let allAllowed = true;
    for (const evId of selectedEnumValues) {
      if (!allowed.has(evId)) {
        allAllowed = false;
        break;
      }
    }
    if (allAllowed) {
      return { variantId, rarity };
    }
  }

  // Fallback to highest rarity variant
  const lastRarity = config.rarityOrder[config.rarityOrder.length - 1];
  if (lastRarity && config.rarityToVariantId[lastRarity]) {
    return {
      variantId: config.rarityToVariantId[lastRarity],
      rarity: lastRarity,
    };
  }

  return { variantId: null, rarity: null };
}
