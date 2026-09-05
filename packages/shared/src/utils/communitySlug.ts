/**
 * A community's slug is the DNS label it is served from: `cloverse` in
 * `cloverse.chardb.cc`. Three callers have to agree on what a legal slug is --
 * the backend validates one on creation, the frontend parses one back out of
 * `window.location.hostname`, and the migration backfilled the existing ones --
 * so the rules live here rather than three times over.
 *
 * A slug is chosen once and never changes. See the `slug` field on the
 * `Community` model for why.
 */

/** Maximum length of a single DNS label, and therefore of a slug. */
export const COMMUNITY_SLUG_MAX_LENGTH = 63;

/**
 * Short enough to stay useful in a URL bar and to keep typo-squatting between
 * two communities unlikely. Nothing technical forces it.
 */
export const COMMUNITY_SLUG_MIN_LENGTH = 3;

/**
 * Labels a community may not take, because something else already answers to
 * them or will need to.
 *
 * Three groups, all in one list because the check does not care why: hosts the
 * infrastructure already uses or reserves (`api`, `mail`, `www`, and the mail
 * and nameserver conventions around them), hosts a future version of the
 * product would plausibly want (`admin`, `docs`, `status`, `blog`), and
 * environment names that would be actively confusing to hand out (`dev`,
 * `staging`, `localhost`).
 *
 * Kept in sync with the identical list in
 * `packages/database/prisma/migrations/20260905120000_community_slugs`. That
 * one is frozen -- it describes what the backfill did -- so entries added here
 * later apply to new communities only.
 */
export const RESERVED_COMMUNITY_SLUGS: ReadonlySet<string> = new Set([
  // Infrastructure that already exists or is conventional
  "www",
  "api",
  "mail",
  "smtp",
  "imap",
  "ftp",
  "ns",
  "ns1",
  "ns2",
  // Plausible future product surfaces
  "admin",
  "app",
  "auth",
  "static",
  "cdn",
  "assets",
  "img",
  "images",
  "media",
  "files",
  "status",
  "health",
  "docs",
  "doc",
  "help",
  "support",
  "blog",
  "about",
  // Environment names
  "dev",
  "staging",
  "stage",
  "test",
  "preview",
  "localhost",
  "chardb",
]);

/**
 * Lowercase alphanumerics and interior hyphens. Deliberately stricter than DNS
 * allows: no leading or trailing hyphen, and no `xn--` punycode, so a slug is
 * always the same string a human typed.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CommunitySlugRejection =
  | "too-short"
  | "too-long"
  | "malformed"
  | "reserved";

/**
 * Why this string cannot be a slug, or `null` if it can.
 *
 * Returns the reason rather than a boolean so the caller can say which rule was
 * broken -- "that name is taken by the site" and "slugs cannot contain spaces"
 * are different messages to a person naming their community.
 */
export const rejectCommunitySlug = (
  slug: string,
): CommunitySlugRejection | null => {
  if (slug.length < COMMUNITY_SLUG_MIN_LENGTH) return "too-short";
  if (slug.length > COMMUNITY_SLUG_MAX_LENGTH) return "too-long";
  if (!SLUG_PATTERN.test(slug)) return "malformed";
  if (RESERVED_COMMUNITY_SLUGS.has(slug)) return "reserved";
  return null;
};

export const isValidCommunitySlug = (slug: string): boolean =>
  rejectCommunitySlug(slug) === null;

/**
 * Best-effort slug for a display name, for prefilling the field when someone
 * creates a community.
 *
 * Matches the backfill migration's derivation so a community created today and
 * one backfilled yesterday get the same answer from the same name. It can
 * still return something invalid -- a name of nothing but punctuation, or one
 * that normalises onto a reserved label -- which is the caller's cue to make
 * the person choose rather than to silently mangle it further.
 */
export const suggestCommunitySlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, COMMUNITY_SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
