import { useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * A ledger's search box and its growing page, shared by the item and currency
 * ledgers (#444).
 *
 * Both ledgers page by raising `limit` and refetching from the top rather than
 * appending with `fetchMore`, which is why this is not `useOffsetPaging`.
 *
 * The search reaches the server once typing pauses. The page size belongs to
 * the search it was raised on: any other search starts from the first page.
 */
export function useLedgerSearch(pageSize: number) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(
    search.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const [pages, setPages] = useState({ search: "", limit: pageSize });

  // Forget a raised page as soon as its search is gone, so returning to that
  // search later starts from the first page too. Done during render, which
  // React re-runs before committing; the limit below already reads as the
  // first page in this render, so the render React throws away -- where
  // Apollo starts its query -- never asks for the stale size.
  if (pages.search !== debouncedSearch && pages.limit !== pageSize) {
    setPages({ search: debouncedSearch, limit: pageSize });
  }
  const limit = pages.search === debouncedSearch ? pages.limit : pageSize;

  return {
    /** What is in the box, untrimmed. */
    search,
    setSearch,
    /** What the query searches for. Empty means no search. */
    debouncedSearch,
    limit,
    /**
     * The box says something the query has not been sent yet. Results on
     * screen belong to the previous search.
     */
    typing: search.trim() !== debouncedSearch,
    loadMore: () =>
      setPages({ search: debouncedSearch, limit: limit + pageSize }),
    /** Back to the first page, for a filter change other than the search. */
    resetPages: () => setPages({ search: debouncedSearch, limit: pageSize }),
  };
}
