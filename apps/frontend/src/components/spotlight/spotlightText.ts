import type { SpotlightQuery } from "./spotlightQuery";
import type { SpotlightGroup } from "./types";

// The hint is the feature. A people search nobody knows the sigil for is the
// same unfindable inventory this replaced (#349).
export const SEARCH_PLACEHOLDER = "Search pages, or @ for members...";

/** Enough to scan at a glance; past it, typing narrows faster than reading. */
export const RESULT_LIMIT = 7;

/**
 * Answering the question that was asked. "No pages found" to someone who typed
 * a person's name reads as the person not existing -- and "nobody by that
 * name" reads the same way to someone who is not in a community at all, where
 * there is no membership to search.
 */
export function nothingFoundText(
  parsed: SpotlightQuery,
  inCommunity: boolean,
  /** Members for what was typed are still on their way: no answer yet. */
  pending: boolean,
): string {
  if (pending) return "";
  if (parsed.mode === "pages") return "No pages found... try @ for members";
  if (!inCommunity) return "Open a community to search its members";
  if (parsed.mode === "people") return "Nobody here by that name...";
  return "No pages of theirs match that...";
}

/** Typing in these, Mod+K is theirs. */
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable);

/**
 * Ctrl+K, or Cmd+K on Mac, outside a field being typed in. Exactly those
 * modifiers: Ctrl+Shift+K and the like belong to the browser (Firefox's web
 * console) or to whatever else is bound to them.
 */
export const isPaletteShortcut = (e: KeyboardEvent) =>
  (e.ctrlKey || e.metaKey) &&
  !e.shiftKey &&
  !e.altKey &&
  e.key.toLowerCase() === "k" &&
  !typingIn(e.target);

/** The first `limit` results, across groups in order; empty groups go. */
export function limitResults(
  groups: SpotlightGroup[],
  limit: number,
): SpotlightGroup[] {
  let left = limit;
  const kept: SpotlightGroup[] = [];
  for (const group of groups) {
    if (left <= 0) break;
    const actions = group.actions.slice(0, left);
    left -= actions.length;
    if (actions.length > 0) kept.push({ ...group, actions });
  }
  return kept;
}
