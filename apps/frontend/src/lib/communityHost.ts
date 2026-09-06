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
 * The query parameter carrying where to go back to after signing in.
 *
 * Signing in always happens at the apex, because that is where the cookie for
 * the whole parent domain is set -- so leaving a community host is unavoidable.
 * Coming back is not: the return address rides in the URL because
 * `location.state`, which the router would otherwise use, does not survive a
 * navigation across origins.
 */
export const RETURN_TO_PARAM = "next";

/**
 * The URL to return to after signing in, or `null` if there is not a safe one.
 *
 * A return address is attacker-controllable by construction -- it is a query
 * parameter on a public page -- so this is an open redirect unless it is
 * checked. Only this site's own hosts are accepted: the apex, or exactly one
 * label under it, which is what a community is. `https://chardb.cc.evil.example`
 * and `https://evil.example/?x=chardb.cc` both fail, because the comparison is
 * against a parsed hostname rather than the string.
 *
 * Relative paths are accepted and returned as-is; they cannot leave the origin.
 */
export const safeReturnUrl = (raw: string | null): string | null => {
  if (!raw) return null;

  // A path, not a URL. `//evil.example` is protocol-relative and would leave
  // the site, so a second slash disqualifies it.
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (host === ROOT_DOMAIN) return raw;

  const suffix = `.${ROOT_DOMAIN}`;
  if (!host.endsWith(suffix)) return null;

  const label = host.slice(0, -suffix.length);
  return label.length > 0 && !label.includes(".") ? raw : null;
};

/**
 * Pages that are not somewhere to come back to.
 *
 * Returning to `/login` after signing in means arriving at the sign-in form
 * already signed in, and returning to it from itself nests one return address
 * inside another until the URL is unreadable.
 */
const NOT_A_RETURN_DESTINATION = new Set([
  "/login",
  "/signup",
  "/forgot-password",
]);

/**
 * A `/login` link that remembers where it was clicked from.
 *
 * The current page goes in as an absolute URL, because it may be on a
 * community host while the login page never is.
 */
export const loginUrlReturningHere = (): string => {
  if (NOT_A_RETURN_DESTINATION.has(window.location.pathname)) return "/login";

  return `/login?${RETURN_TO_PARAM}=${encodeURIComponent(window.location.href)}`;
};

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
