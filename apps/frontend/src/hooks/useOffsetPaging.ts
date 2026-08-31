import { useCallback, useState } from "react";

/**
 * How a list page asks for its next page and keeps the one it has.
 *
 * The backend's list queries share a shape -- eleven of them return
 * `{ <named array>, total, hasMore }` and take `{ limit, offset }` -- so the
 * plumbing around them is the same every time: work out the offset from what
 * is already on screen, refuse to ask when `hasMore` is false, and append the
 * answer instead of replacing what is there.
 *
 * Getting the last part wrong is quiet and nasty: `fetchMore` replaces the
 * cached result by default, so a Load More button written without `updateQuery`
 * removes the characters it was supposed to add to.
 *
 * The `fetchMore` call itself stays at the call site, and deliberately. Its
 * `updateQuery` merge is the one genuinely query-specific piece -- the root
 * field is `characters` on one query and `myCharacters` on another -- and
 * wrapping Apollo's own generics to hide it costs more in casts than it saves
 * in lines. What the hook takes off every caller is the part that is the same
 * everywhere and easy to get wrong: the offset arithmetic, the guard, and the
 * in-flight flag.
 */
interface OffsetPagingOptions {
  /** How many to ask for each time. Also the first page's size. */
  pageSize: number;
  /** How many are on screen now. Becomes the next request's offset. */
  loaded: number;
  /** Whether the server says there is anything left. */
  hasMore: boolean;
  /**
   * Fetch one page. Call `fetchMore` here, where the query's types are
   * concrete, and append rather than replace in its `updateQuery`.
   */
  load: (page: { limit: number; offset: number }) => Promise<unknown>;
}

export interface OffsetPaging {
  /** Ask for the next page. A no-op when there is nothing left. */
  loadMore: () => void;
  /**
   * True only while a *further* page is in flight.
   *
   * Distinct from the query's own `loading`, which is also true during the
   * first load. A page that shows a full-screen spinner on `loading` would
   * blank itself on Load More and lose the reader's place, so the two need
   * telling apart.
   */
  loadingMore: boolean;
}

export function useOffsetPaging({
  pageSize,
  loaded,
  hasMore,
  load,
}: OffsetPagingOptions): OffsetPaging {
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = useCallback(() => {
    // Guarding on `loadingMore` too, not just `hasMore`: a second click while
    // the first page is still in flight would ask for the same offset again
    // and append the same rows twice.
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    void load({ limit: pageSize, offset: loaded }).finally(() =>
      setLoadingMore(false),
    );
  }, [hasMore, loadingMore, load, pageSize, loaded]);

  return { loadMore, loadingMore };
}
