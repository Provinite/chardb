import React, { createContext, useContext, useMemo, ReactNode } from "react";
import { useCommunityBySlugQuery } from "../generated/graphql";
import { currentCommunitySlug } from "../lib/communityHost";

type HostCommunity = NonNullable<
  ReturnType<typeof useCommunityBySlugQuery>["data"]
>["communityBySlug"];

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

  const { data, loading } = useCommunityBySlugQuery({
    variables: { slug: slug ?? "" },
    skip: !slug,
    // A community's name and id do not change under a reader, and every page
    // on the host depends on this answer.
    fetchPolicy: "cache-first",
  });

  const value = useMemo<CommunityHostContextType>(
    () => ({
      slug,
      community: data?.communityBySlug ?? null,
      loading: Boolean(slug) && loading,
    }),
    [slug, data, loading],
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
