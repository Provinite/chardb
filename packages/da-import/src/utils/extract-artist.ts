const DA_USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_USERNAME_LENGTH = 20;

function isValidDaUsername(s: string): boolean {
  if (s.length < 2 || s.length > MAX_USERNAME_LENGTH) return false;
  if (!DA_USERNAME_RE.test(s)) return false;
  return true;
}

function isUuidTitle(title: string): boolean {
  // Matches DA auto-generated titles like "Dczf06o-4d937bc3-9b5b-4ff1-8a00-8e51ee7a9646"
  const dashIdx = title.indexOf("-");
  if (dashIdx === -1) return false;
  const suffix = title.slice(dashIdx + 1);
  return UUID_RE.test(suffix);
}

/**
 * Extract a DeviantArt artist username from a sta.sh oEmbed title.
 *
 * Titles typically follow "CharacterName - ArtistUsername" but formatting
 * varies. Scans left-to-right for the first dash where everything after
 * it (trimmed) is a valid DA username.
 *
 * - 0 dashes → undefined
 * - 1 dash → check if second part is a valid username
 * - >1 dashes → first dash where the remainder is a valid username
 */
export function extractArtistFromTitle(
  title: string
): string | undefined {
  if (isUuidTitle(title)) return undefined;

  for (let i = 0; i < title.length; i++) {
    if (title[i] !== "-") continue;

    const candidate = title.slice(i + 1).trim();
    if (isValidDaUsername(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
