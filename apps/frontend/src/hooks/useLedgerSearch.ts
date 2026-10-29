import { useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * A ledger's search box, shared by the item and currency ledgers (#444).
 *
 * The search reaches the server once typing pauses. Paging is
 * `useOffsetPaging`'s: a new search is a new query, so it starts from the
 * first page on its own.
 */
export function useLedgerSearch() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(
    search.trim(),
    SEARCH_DEBOUNCE_MS,
  );

  return {
    /** What is in the box, untrimmed. */
    search,
    setSearch,
    /** What the query searches for. Empty means no search. */
    debouncedSearch,
    /**
     * The box says something the query has not been sent yet. Results on
     * screen belong to the previous search.
     */
    typing: search.trim() !== debouncedSearch,
  };
}

/**
 * The rows of `next` not already in `shown`, by id.
 *
 * Ledgers are newest first, so events recorded between two Load mores push
 * rows down: the next page starts with rows already on screen.
 */
export function unseenRows<T extends { id: string }>(
  shown: readonly T[],
  next: readonly T[],
): T[] {
  const ids = new Set(shown.map((row) => row.id));
  return next.filter((row) => !ids.has(row.id));
}
