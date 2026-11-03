import type { ApolloCache } from "@apollo/client";

/**
 * A mutation `update` that drops every cached copy of the named root query
 * fields, so each list is fetched fresh the next time anything reads it.
 *
 * `refetchQueries` by name only reaches queries on screen, and by document
 * only the one set of variables it is given. A list cached under other
 * variables -- a community host's scope, another page size -- or one that is
 * not mounted when the write happens would keep serving the old result.
 * Evicting the field covers both: watching queries refetch at once, the rest
 * when they next mount.
 */
export const invalidateLists =
  (...fieldNames: string[]) =>
  (cache: ApolloCache<unknown>): void => {
    for (const fieldName of fieldNames) {
      cache.evict({ id: "ROOT_QUERY", fieldName });
    }
    cache.gc();
  };
