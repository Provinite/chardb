import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useCommunityBySlugQuery } from "../generated/graphql";
import { currentHostTarget } from "../lib/communityHost";

/**
 * What the host resolves to: the whole community record.
 *
 * The full record rather than an id, because otherwise every page on a
 * community host took the id from here and immediately queried `community(id:)`
 * for the same row -- an identical selection set, fetched twice per page load,
 * on ten pages. `communityBySlug` already returned all of it.
 *
 * The cost is that the remembered copy below carries more, so a `name` or
 * `memberCount` edited since the last visit is stale for one render before the
 * refetch lands. The id it is keyed on cannot go stale.
 */
type HostCommunity = NonNullable<
  NonNullable<
    ReturnType<typeof useCommunityBySlugQuery>["data"]
  >["communityBySlug"]
>;

/** Where a resolved host is remembered between page loads. */
const storageKey = (slug: string) => `chardb.community.${slug}`;

/**
 * `localStorage` throws rather than returning null in some browsers -- Safari
 * in private mode, anything with site data disabled -- and this is a cache, so
 * every path through it degrades to "ask the server" rather than failing.
 */
const readRemembered = (slug: string | null): HostCommunity | null => {
  if (!slug) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as HostCommunity).id === "string" &&
      typeof (parsed as HostCommunity).name === "string"
    ) {
      return { ...(parsed as HostCommunity), slug };
    }
  } catch {
    // Unreadable or unparseable. Ask the server.
  }

  return null;
};

const rememberCommunity = (slug: string, community: HostCommunity): void => {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(community));
  } catch {
    // Storage full or unavailable; the app works without it.
  }
};

const forgetRemembered = (slug: string): void => {
  try {
    window.localStorage.removeItem(storageKey(slug));
  } catch {
    // As above.
  }
};

interface CommunityHostContextType {
  /** The slug in the hostname, or null at the apex. */
  slug: string | null;
  /**
   * The community that slug resolves to. Null at the apex, and also null for
   * a slug no community holds -- the wildcard DNS record answers for every
   * label, so `nonsense.chardb.cc` is a page someone can reach.
   */
  community: HostCommunity | null;
  /** True while the slug is still being resolved. Always false at the apex. */
  loading: boolean;
  /**
   * True when this hostname names nothing -- a label no community holds, or
   * one that could never be a slug. Both are addresses somebody can reach,
   * because the wildcard DNS record answers for every label.
   */
  isUnknownHost: boolean;
  /**
   * True when the community could not be looked up at all -- the request
   * failed. Distinct from `isUnknownHost`, which means the server answered and
   * said there is nothing here. One is a broken connection, the other is a
   * wrong address, and telling somebody the wrong thing about which is worse
   * than saying nothing.
   */
  unreachable: boolean;
  /**
   * Re-read the host community. For the pages that can CHANGE it -- renaming
   * it, linking a Discord guild -- which previously held their own query and
   * refetched that.
   */
  refetch: () => void;
}

const CommunityHostContext = createContext<
  CommunityHostContextType | undefined
>(undefined);

/**
 * Resolves the hostname to a community, once, for the whole app.
 *
 * This is what community context used to cost: `CommunityNavigationSidebar`
 * matched `location.pathname` against six regexes to find whichever id the URL
 * happened to carry, then fired one of five GraphQL queries to turn that
 * species, character, variant, trait or item type into the community it
 * belonged to. It did that because `Layout` mounts outside `<Routes>` and so
 * could not call `useParams()` (#293).
 *
 * A hostname needs none of that. It is one query, on one key, made once, and
 * it is right before the router has decided anything -- which also means the
 * navigation no longer flickers through "no community" while a lookup lands.
 */
export const CommunityHostProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // The hostname cannot change without a page load, so this is read once
  // rather than watched.
  const target = useMemo(() => currentHostTarget(), []);
  const slug = target.kind === "community" ? target.slug : null;

  // What this host resolved to last time. Apollo's cache is per page load, so
  // without this every visit blocks the whole app on the same answer to the
  // same question -- and it is a question that only has one answer ever: a
  // slug is chosen at creation and never changes, and an id never changes, so
  // the mapping is permanent rather than merely cacheable.
  const [remembered, setRemembered] = useState(() => readRemembered(slug));

  const { data, loading, error, refetch } = useCommunityBySlugQuery({
    variables: { slug: slug ?? "" },
    skip: !slug,
    fetchPolicy: "cache-first",
  });

  const fetched = data?.communityBySlug;

  useEffect(() => {
    if (!slug || loading) return;

    // A FAILED request says nothing about whether the community exists, and
    // must not be read as "it does not". Forgetting on an error would bounce
    // every visitor to a community host off it on one 5xx, and wipe the
    // remembered id on the way out so the next visit blocks on the query
    // again -- turning a blip into an outage for that community.
    if (error) return;

    // A slug that resolves to nothing is a community that has been deleted, or
    // never existed. Forget it rather than keeping a dead id alive forever.
    if (!fetched) {
      forgetRemembered(slug);
      setRemembered(null);
      return;
    }

    rememberCommunity(slug, fetched);
  }, [slug, loading, error, fetched]);

  const value = useMemo<CommunityHostContextType>(
    () => ({
      slug,
      // The fetched record wins the moment it lands, so a name that changed
      // since the last visit is stale for one render and no longer. The id
      // behind it cannot go stale at all.
      community: fetched ?? remembered,
      // Nothing to wait for when this host is already known.
      loading: Boolean(slug) && loading && !remembered,
      // Either the label could never be a slug, or it is one nobody holds.
      // The app treats both the same way: this address is not a community.
      // Unknown means "the server told us there is nothing here", not "we
      // could not ask". An error leaves this false, so the app renders the
      // failure rather than silently redirecting away from it.
      isUnknownHost:
        target.kind === "unknown" ||
        (target.kind === "community" &&
          !loading &&
          !error &&
          !fetched &&
          !remembered),
      refetch: () => {
        void refetch();
      },
      unreachable: Boolean(slug) && Boolean(error) && !remembered,
    }),
    [slug, target, fetched, remembered, loading, error, refetch],
  );

  return (
    <CommunityHostContext.Provider value={value}>
      {children}
    </CommunityHostContext.Provider>
  );
};

export const useCommunityHost = (): CommunityHostContextType => {
  const context = useContext(CommunityHostContext);
  if (context === undefined) {
    throw new Error(
      "useCommunityHost must be used within a CommunityHostProvider",
    );
  }
  return context;
};

/**
 * The id of the community whose host this is.
 *
 * Most pages under a community host were written against a `:communityId`
 * route param. They now take it from here instead, which is why so many
 * `useParams()` calls disappear alongside the route prefix.
 */
export const useCommunityId = (): string | null =>
  useCommunityHost().community?.id ?? null;

/**
 * The community whose host this is, whole.
 *
 * Prefer this over `useCommunityId()` followed by `useCommunityByIdQuery`:
 * that pair asked the server for a record this context is already holding,
 * with the same selection set, once per page load. `community(id:)` is still
 * the right call for a community that is NOT the host's -- the legacy-URL
 * forwarder resolves an arbitrary id and has no other way.
 */
export const useHostCommunity = (): HostCommunity | null =>
  useCommunityHost().community;
