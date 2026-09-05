import { isValidCommunitySlug } from "@chardb/shared";

/**
 * Which community the browser is currently looking at, read off the hostname.
 *
 * This replaces the pathname regexes the navigation used to carry. `Layout`
 * mounts outside `<Routes>`, so it could never call `useParams()` and instead
 * matched `location.pathname` against six patterns and then made a GraphQL
 * round-trip per URL shape to turn a species, character, variant, trait or
 * item type id into the community it belonged to (#293, #339). A hostname is
 * available synchronously to every component, needs no router, and cannot be
 * wrong about which community it names.
 *
 * A character with no species is the one thing that has no host: it belongs to
 * no community, so it lives at the apex. See `CharacterPage`.
 */

/**
 * The domain communities hang off. `chardb.cc` in production, `localhost` in
 * development -- browsers resolve `*.localhost` to loopback without touching
 * /etc/hosts, so `willowmere.localhost:20600` just works.
 */
export const ROOT_DOMAIN: string =
  import.meta.env.VITE_ROOT_DOMAIN ?? "localhost";

/**
 * Hosts that are the apex even though they are a label under it. `www` is
 * reserved from slugs for exactly this reason, so it can never be a community.
 */
const APEX_ALIASES = new Set(["www"]);

/**
 * The community slug a hostname names, or `null` for the apex.
 *
 * Returns null rather than throwing for anything unrecognised. The wildcard
 * DNS record answers for every label, so `nonsense.chardb.cc` reaches the app
 * exactly as a real community does; treating that as apex-with-no-community is
 * the caller's problem to render, not an exception to raise here.
 */
export const parseCommunitySlug = (hostname: string): string | null => {
  const host = hostname.toLowerCase();
  if (host === ROOT_DOMAIN) return null;

  const suffix = `.${ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const label = host.slice(0, -suffix.length);
  // Only a single label is a community. `a.b.chardb.cc` is not one.
  if (label.includes(".")) return null;
  if (APEX_ALIASES.has(label)) return null;

  return isValidCommunitySlug(label) ? label : null;
};

/** The community slug for the page currently open, or null at the apex. */
export const currentCommunitySlug = (): string | null =>
  parseCommunitySlug(window.location.hostname);

/**
 * Whatever follows the hostname in a URL -- `:20600` in development, nothing
 * in production. Carried through every cross-host link so a dev instance does
 * not send you to port 80.
 */
const port = (): string =>
  window.location.port ? `:${window.location.port}` : "";

const origin = (host: string): string =>
  `${window.location.protocol}//${host}${port()}`;

/** Absolute URL for `path` on the site's apex host. */
export const apexUrl = (path = "/"): string => `${origin(ROOT_DOMAIN)}${path}`;

/** Absolute URL for `path` on a community's own host. */
export const communityUrl = (slug: string, path = "/"): string =>
  `${origin(`${slug}.${ROOT_DOMAIN}`)}${path}`;

/**
 * Absolute URL for a character, wherever it lives.
 *
 * A character reached its community through a nullable `speciesId`, so one
 * that has been kicked from its species -- or whose species was deleted, which
 * sets the column null rather than cascading -- has no community and therefore
 * no host. Those stay at the apex permanently; that is the honest consequence
 * of the data model rather than a case to design around.
 */
export const characterUrl = (
  characterId: string,
  communitySlug: string | null | undefined,
): string =>
  communitySlug
    ? communityUrl(communitySlug, `/character/${characterId}`)
    : apexUrl(`/character/${characterId}`);
