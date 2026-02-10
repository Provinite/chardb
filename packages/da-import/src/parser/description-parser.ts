import * as cheerio from "cheerio";

export interface ParsedDescription {
  characterName: string;
  ownerUsername: string;
  traitLines: string[];
  rawText: string;
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
  fallbackName: string
): ParsedDescription {
  const $ = cheerio.load(html);

  // Replace <br> tags with newlines to split into lines
  $("br").replaceWith("\n");

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

  // Extract owner — look for "Current Owner:" context in HTML
  let ownerUsername = "";

  // Find the DA username link after "Current Owner" text
  const htmlLower = html.toLowerCase();
  const ownerIdx = htmlLower.indexOf("current owner");
  if (ownerIdx !== -1) {
    // Find the next DA username link after the owner label
    const afterOwner = html.slice(ownerIdx);
    const linkMatch = afterOwner.match(
      /href="https?:\/\/([^.]+)\.deviantart\.com"/
    );
    if (linkMatch) {
      ownerUsername = linkMatch[1];
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

  // Extract trait lines — lines after "Features:" that have rarity prefixes
  const traitLines: string[] = [];
  let inFeatures = false;

  for (const line of allLines) {
    // Detect features section
    if (/^features\s*:/i.test(line)) {
      inFeatures = true;
      // The rest of this line after "Features:" might have content
      const afterLabel = line.replace(/^features\s*:\s*/i, "").trim();
      if (afterLabel && /^(common|uncommon|rare|very\s+rare|legendary|exclusive)\s+/i.test(afterLabel)) {
        traitLines.push(afterLabel);
      }
      continue;
    }

    if (!inFeatures) continue;

    // End of features section — stop at bracketed resale/trade lines or boilerplate
    if (/^\[/.test(line) || /^pillowings\s+are/i.test(line)) {
      break;
    }

    // Lines with rarity prefixes are traits
    if (/^(common|uncommon|rare|very\s+rare|legendary|exclusive)\s+/i.test(line)) {
      traitLines.push(line);
    }
  }

  return {
    characterName: characterName.replace(/^#*\s*/, "").trim(),
    ownerUsername,
    traitLines,
    rawText,
  };
}
