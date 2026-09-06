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
 * Where to come back to after signing in, as two parameters rather than one
 * URL: which community, and which path within it.
 *
 * Signing in always happens at the apex, because that is where the cookie for
 * the whole parent domain is set -- so leaving a community host is
 * unavoidable. Coming back is not, and the way back has to travel in the URL,
 * because `location.state` does not survive a navigation across origins.
 *
 * Split rather than absolute so that a foreign origin cannot be *expressed*.
 * An absolute URL in a query parameter is an open redirect that has to be
 * defended against -- parse it, check the scheme, compare the hostname, catch
 * `//evil.example` and `chardb.cc.evil.example`. A slug and a path have
 * nowhere to put `evil.example`: the slug is checked by the same rule that
 * decides what a community may be called, and the destination is *built* by
 * `communityUrl` rather than taken from the caller. Scheme and port come from
 * the current page, which is where they should come from anyway.
 *
 * A missing slug means the apex.
 */
export const RETURN_SLUG_PARAM = "nextCommunitySlug";
export const RETURN_PATH_PARAM = "nextPath";

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
 * Relative, because the router resolves it against whichever host it was
 * clicked on -- and on a community host that `/login` route is the hop to the
 * apex, which carries these parameters along with the rest of the query.
 */
export const loginUrlReturningHere = (): string => {
  if (NOT_A_RETURN_DESTINATION.has(window.location.pathname)) return "/login";

  const params = new URLSearchParams();
  const slug = currentCommunitySlug();
  if (slug) params.set(RETURN_SLUG_PARAM, slug);
  params.set(
    RETURN_PATH_PARAM,
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );

  return `/login?${params.toString()}`;
};

/**
 * Where to go once signed in, built from the two parameters, or `null` if they
 * do not name anywhere.
 *
 * Returns a path when the destination is the apex -- the login page is always
 * there, so the router can handle it -- and an absolute URL when it is a
 * community, which is a different origin and needs a whole-page navigation.
 */
export const returnDestination = (params: URLSearchParams): string | null => {
  const path = params.get(RETURN_PATH_PARAM);
  // `//evil.example` is protocol-relative: a URL wearing a path's clothes.
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;

  const slug = params.get(RETURN_SLUG_PARAM);
  if (!slug) return path;

  // The same rule that decides what a community may be called. A slug that
  // could not name one cannot name a destination either.
  return isValidCommunitySlug(slug) ? communityUrl(slug, path) : null;
};

/**
 * The path part of `url` if it lands on the page's own origin, else `null`.
 *
 * Splitting hosts made every cross-scope link absolute, and an absolute URL in
 * an `<a href>` is a whole-page load even when it points at the page it is
 * already on. That is most character links: a community's roster links to
 * characters in that same community. `HostAwareLink` uses this to keep those
 * client-side and reserve the page load for links that genuinely cross.
 */
export const localPath = (url: string): string | null => {
  // Already a path. `//evil.example` is a URL wearing a path's clothes.
  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
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
