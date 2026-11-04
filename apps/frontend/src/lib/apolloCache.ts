import { InMemoryCache } from "@apollo/client";
import { cursorConnection } from "./cursorConnection";

/**
 * Stores a field looked up by username under the lowercased name.
 *
 * Usernames ignore case, so `FOO` and `foo` are one person. Profile pages
 * correct a miscased URL once the user loads, and the corrected URL asks
 * again; keyed this way, the second ask is answered from the first.
 */
const byUsername = (
  args: Record<string, unknown> | null,
): string | undefined => {
  if (typeof args?.username === "string") {
    return `{"username":${JSON.stringify(args.username.toLowerCase())}}`;
  }
  return args ? JSON.stringify(args) : undefined;
};

/**
 * The app's Apollo cache. Apart from the client so the type policies can be
 * tested without building the links.
 */
export function createCache(): InMemoryCache {
  return new InMemoryCache({
    typePolicies: {
      // Keyed by kind rather than by an id, because it has none: a preference
      // row is always the viewer's own, so the kind alone identifies it. Without
      // this the type is unnormalisable, the mutation's reply cannot be merged
      // into the query that rendered the switches, and a toggle visibly snaps
      // back until the next refetch.
      NotificationPreference: {
        keyFields: ["kind"],
      },
      Query: {
        fields: {
          user: { keyArgs: byUsername },
          userProfile: { keyArgs: byUsername },
          getFollowers: { keyArgs: byUsername },
          getFollowing: { keyArgs: byUsername },
          users: {
            keyArgs: [],
            merge(existing = { nodes: [], totalCount: 0 }, incoming) {
              return {
                ...incoming,
                nodes: [...existing.nodes, ...incoming.nodes],
              };
            },
          },
          // `first` keeps the permission matrix's 100 apart from the members
          // page's 50; "Load more" pages with the same `first`.
          communityMembersByCommunity: cursorConnection([
            "communityId",
            "search",
            "first",
          ]),
          characters: {
            keyArgs: ["filters"],
            merge(
              existing = { characters: [], total: 0 },
              incoming,
              { variables },
            ) {
              // If this is a fresh query (offset 0) or different filters, replace existing data
              const isLoadMore =
                variables?.filters?.offset && variables.filters.offset > 0;

              if (!isLoadMore) {
                // Fresh search - replace existing data
                return incoming;
              }

              // Load more - append to existing data
              return {
                ...incoming,
                characters: [
                  ...(existing.characters || []),
                  ...(incoming.characters || []),
                ],
              };
            },
          },
        },
      },
    },
  });
}
