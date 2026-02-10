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
 * Typical structure:
 * - Title/Name line at the top (often bold or in a heading)
 * - "Owner: Username" or "Owned by: Username" line
 * - Bullet list of traits, often with rarity prefixes
 *
 * This parser is deliberately permissive — it extracts what it can and
 * flags unparseable content as warnings downstream.
 */
export function parseDescription(
  html: string,
  fallbackName: string
): ParsedDescription {
  const $ = cheerio.load(html);

  // Get the raw text content, preserving some structure
  const rawText = $("body").text().trim();

  // Extract all text lines, cleaning up whitespace
  const allLines = rawText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Try to extract character name from the first bold or heading element
  let characterName = "";
  const headings = $("h1, h2, h3, b, strong").first().text().trim();
  if (headings) {
    characterName = headings;
  }

  // Fallback: try first line
  if (!characterName && allLines.length > 0) {
    characterName = allLines[0];
  }

  // Final fallback: use DA title
  if (!characterName) {
    characterName = fallbackName;
  }

  // Extract owner — look for "Owner:", "Owned by:", or DA username links
  let ownerUsername = "";
  const ownerPatterns = [
    /owner\s*:\s*(\S+)/i,
    /owned\s+by\s*:\s*(\S+)/i,
    /belongs\s+to\s*:\s*(\S+)/i,
  ];

  for (const line of allLines) {
    for (const pattern of ownerPatterns) {
      const match = line.match(pattern);
      if (match) {
        ownerUsername = match[1].replace(/^@/, "");
        break;
      }
    }
    if (ownerUsername) break;
  }

  // Also check for DA user links (icon links like :iconUsername:)
  if (!ownerUsername) {
    const iconMatch = rawText.match(/:icon([^:]+):/i);
    if (iconMatch) {
      ownerUsername = iconMatch[1];
    }
  }

  // Check for DA user links in HTML
  if (!ownerUsername) {
    $("a").each((_i, el) => {
      const href = $(el).attr("href") || "";
      const userMatch = href.match(/deviantart\.com\/([^/]+)$/);
      if (userMatch && !ownerUsername) {
        const text = $(el).text().trim().toLowerCase();
        // Only take it if it's in an owner context
        const parentText = $(el).parent().text().toLowerCase();
        if (
          parentText.includes("owner") ||
          parentText.includes("owned") ||
          parentText.includes("belongs")
        ) {
          ownerUsername = userMatch[1];
        }
      }
    });
  }

  // Extract trait lines — look for bullet-like patterns
  // Lines that start with common trait indicators or have rarity prefixes
  const traitLines: string[] = [];
  const rarityPrefixes = /^(exclusive|legendary|very\s+rare|rare|uncommon|common)\s+/i;
  const bulletPrefixes = /^[-•*❖►▸▹◆◇○●]\s*/;

  for (const line of allLines) {
    const cleaned = line.replace(bulletPrefixes, "").trim();
    if (!cleaned) continue;

    // Skip owner/name lines
    if (
      /^owner\s*:/i.test(cleaned) ||
      /^owned\s+by/i.test(cleaned) ||
      /^belongs\s+to/i.test(cleaned) ||
      /^name\s*:/i.test(cleaned)
    ) {
      continue;
    }

    // Lines with rarity prefixes are likely traits
    if (rarityPrefixes.test(cleaned)) {
      traitLines.push(cleaned);
      continue;
    }

    // Lines that look like trait descriptions (contain colons for categories)
    if (/^\w[\w\s]*:/.test(cleaned) && cleaned.length < 200) {
      traitLines.push(cleaned);
      continue;
    }

    // Lines in bullet-list context
    if (bulletPrefixes.test(line)) {
      traitLines.push(cleaned);
    }
  }

  return {
    characterName: characterName.replace(/^#*\s*/, "").trim(),
    ownerUsername,
    traitLines,
    rawText,
  };
}
