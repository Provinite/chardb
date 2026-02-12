import * as cheerio from "cheerio";
import type { ExactLineRule, ExactLineMapping } from "../types/mapping-config";

const RARITY_PATTERN =
  /^(common|uncommon|rare|very\s+rare|legendary|exclusive|special)\s+/i;

/**
 * Normalize a trait line in the features section to fix common formatting
 * issues found in DA descriptions.
 */
function normalizeTraitLine(line: string): string {
  let s = line;

  // Strip bullet emoticon text prefixes (:bulletgreen:, bulletblue:, etc.)
  s = s.replace(/^:?\s*bullet\w*:?\s*/i, "");

  // Strip leading colons (": Common Stitching")
  s = s.replace(/^:\s*/, "");

  // Fix "Special:" with colon → "Special"
  s = s.replace(/^special:\s*/i, "Special ");

  // Fix common rarity typos
  s = s.replace(/^vert rare\b/i, "Very Rare");
  s = s.replace(/^vary rare\b/i, "Very Rare");
  s = s.replace(/^unommon\b/i, "Uncommon");
  s = s.replace(/^uncomment\b/i, "Uncommon");
  s = s.replace(/^uncomming\b/i, "Uncommon");
  s = s.replace(/^commom\b/i, "Common");
  s = s.replace(/^ommon\b/i, "Common");

  // Fix missing space after rarity (CommonMouth → Common Mouth)
  s = s.replace(
    /^(Common|Uncommon|Rare|Legendary|Exclusive|Special)(?=[A-Z])/,
    "$1 "
  );

  // Handle "Standard [Rarity] ..." → "[Rarity] Standard ..."
  const stdRarityMatch = s.match(
    /^standard\s+(common|uncommon|rare|very\s+rare|legendary|exclusive|special)\s+/i
  );
  if (stdRarityMatch) {
    s = stdRarityMatch[1] + " Standard " + s.slice(stdRarityMatch[0].length);
  }

  // Bare "Standard [Trait]" with no rarity → treat as "Common Standard [Trait]"
  if (/^standard\s+/i.test(s) && !RARITY_PATTERN.test(s)) {
    s = "Common " + s;
  }

  return s.trim();
}

export interface ExactLineMatch {
  line: string;
  mappings: ExactLineMapping[];
}

export interface ParsedDescription {
  characterName: string;
  ownerUsername: string;
  category: string;
  traitLines: string[];
  exactLineMatches: ExactLineMatch[];
  rawText: string;
  warnings: string[];
}

/**
 * Parse a DA deviation description HTML into structured data.
 *
 * DA Pillowing descriptions use this structure:
 * - Character name as first text
 * - "Category:" line
 * - "Artist:" with DA user link
 * - "Current Owner:" with DA user link
 * - "Features:" header followed by trait lines
 * - Each trait line is a bullet image + "Rarity TraitName"
 * - Lines separated by <br> tags
 */
export function parseDescription(
  html: string,
  fallbackName: string,
  exactLineRules: ExactLineRule[] = []
): ParsedDescription {
  const $ = cheerio.load(html);

  // Replace <br> tags with newlines to split into lines
  $("br").replaceWith("\n");

  // Insert newlines before block elements so that traits spanning
  // multiple <p> tags don't get concatenated into a single line.
  $("p, div").each((_i, el) => {
    $(el).prepend("\n");
  });

  // Get text with newlines preserved
  const rawText = $("body").text().trim();

  const allLines = rawText
    .split(/\n/)
    .map((l) => l.replace(/\u00a0/g, " ").trim())
    .filter((l) => l.length > 0);

  // Extract character name — first non-empty text line
  let characterName = "";
  for (const line of allLines) {
    // Skip lines that are category/artist/owner labels
    if (/^(category|artist|current\s+owner|owner|features)/i.test(line)) {
      break;
    }
    if (line.length > 0) {
      characterName = line;
      break;
    }
  }
  if (!characterName) {
    characterName = fallbackName;
  }

  // Extract owner — look for "Current Owner:" or "Owner History:" context in HTML
  let ownerUsername = "";

  // Find the DA username link after the owner label.
  // Some older deviations use "Owner History:" instead of "Current Owner:".
  const htmlLower = html.toLowerCase();
  let ownerIdx = htmlLower.indexOf("current owner");
  if (ownerIdx === -1) {
    ownerIdx = htmlLower.indexOf("owner history");
  }
  if (ownerIdx !== -1) {
    // Find the next DA username link after the owner label.
    // Handles both URL formats:
    //   Legacy: https://username.deviantart.com
    //   Current: https://www.deviantart.com/username
    const afterOwner = html.slice(ownerIdx);
    const newLinkMatch = afterOwner.match(
      /href="https?:\/\/www\.deviantart\.com\/([^"/?]+)"/
    );
    const oldLinkMatch = afterOwner.match(
      /href="https?:\/\/([^.]+)\.deviantart\.com"/
    );
    if (newLinkMatch) {
      ownerUsername = newLinkMatch[1];
    } else if (oldLinkMatch && oldLinkMatch[1] !== "www") {
      ownerUsername = oldLinkMatch[1];
    }
  }

  // Fallback: try "Owner:" pattern in text
  if (!ownerUsername) {
    for (const line of allLines) {
      const match = line.match(/(?:current\s+)?owner\s*:\s*(\S+)/i);
      if (match) {
        ownerUsername = match[1].replace(/^@/, "");
        break;
      }
    }
  }

  // Extract category (Official, MYO, Guest, etc.)
  let category = "";
  for (const line of allLines) {
    const catMatch = line.match(/category\s*:\s*(.+)/i);
    if (catMatch) {
      category = catMatch[1].trim();
      break;
    }
  }

  // Build case-insensitive lookup for exact line rules
  const exactLineLookup = new Map<string, ExactLineRule>();
  for (const rule of exactLineRules) {
    exactLineLookup.set(rule.line.toLowerCase(), rule);
  }

  // Extract trait lines — lines after "Features:" that have rarity prefixes
  const traitLines: string[] = [];
  const exactLineMatches: ExactLineMatch[] = [];
  const warnings: string[] = [];
  let inFeatures = false;

  for (const line of allLines) {
    // Detect features section
    if (/^features\s*:?/i.test(line)) {
      inFeatures = true;
      // The rest of this line after "Features:" might have content
      const afterLabel = normalizeTraitLine(
        line.replace(/^features\s*:?\s*/i, "").trim()
      );
      if (afterLabel && RARITY_PATTERN.test(afterLabel)) {
        traitLines.push(afterLabel);
      }
      continue;
    }

    if (!inFeatures) continue;

    // End of features section — stop at bracketed resale/trade lines or boilerplate
    if (/^\[/.test(line) || /^pillowings\s+are/i.test(line)) {
      break;
    }

    // Check exact line rules first — these bypass rarity parsing
    const exactRule = exactLineLookup.get(line.toLowerCase());
    if (exactRule) {
      exactLineMatches.push({ line, mappings: exactRule.mappings });
      continue;
    }

    // Normalize and check for rarity prefixes
    const normalized = normalizeTraitLine(line);
    if (RARITY_PATTERN.test(normalized)) {
      traitLines.push(normalized);
    } else {
      warnings.push(`Unparseable trait line in features section: "${line}"`);
    }
  }

  if (!inFeatures) {
    warnings.push("No features section detected in description");
  }

  return {
    characterName: characterName.replace(/^#*\s*/, "").trim(),
    ownerUsername,
    category,
    traitLines,
    exactLineMatches,
    rawText,
    warnings,
  };
}
