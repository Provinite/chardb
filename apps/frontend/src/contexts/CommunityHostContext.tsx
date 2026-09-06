import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useCommunityBySlugQuery } from "../generated/graphql";
import { currentCommunitySlug } from "../lib/communityHost";

/**
 * What the host resolves to.
 *
 * Deliberately narrow. Everything reachable from a community host can query
 * whatever else it needs about that community; what this context owes them is
 * which community it is, and promising more would mean the remembered copy
 * below had to carry more too.
 */
type HostCommunity = { id: string; name: string; slug: string };

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

const rememberCommunity = (slug: string, id: string, name: string): void => {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify({ id, name }));
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
  const slug = useMemo(() => currentCommunitySlug(), []);

  // What this host resolved to last time. Apollo's cache is per page load, so
  // without this every visit blocks the whole app on the same answer to the
  // same question -- and it is a question that only has one answer ever: a
  // slug is chosen at creation and never changes, and an id never changes, so
  // the mapping is permanent rather than merely cacheable.
  const [remembered, setRemembered] = useState(() => readRemembered(slug));

  const { data, loading } = useCommunityBySlugQuery({
    variables: { slug: slug ?? "" },
    skip: !slug,
    fetchPolicy: "cache-first",
  });

  const fetched = data?.communityBySlug;

  useEffect(() => {
    if (!slug || loading) return;

    // A slug that resolves to nothing is a community that has been deleted, or
    // never existed. Forget it rather than keeping a dead id alive forever.
    if (!fetched) {
      forgetRemembered(slug);
      setRemembered(null);
      return;
    }

    rememberCommunity(slug, fetched.id, fetched.name);
  }, [slug, loading, fetched]);

  const value = useMemo<CommunityHostContextType>(
    () => ({
      slug,
      // The fetched record wins the moment it lands, so a name that changed
      // since the last visit is stale for one render and no longer. The id
      // behind it cannot go stale at all.
      community: fetched ?? remembered,
      // Nothing to wait for when this host is already known.
      loading: Boolean(slug) && loading && !remembered,
    }),
    [slug, fetched, remembered, loading],
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
