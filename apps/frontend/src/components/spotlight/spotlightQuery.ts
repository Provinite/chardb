/**
 * What the search box is being asked, in three shapes.
 *
 * The box answers one question at a time, and the query itself says which.
 * Parsing lives here rather than in either caller because the hook (what to
 * fetch) and the filter (what to show) have to agree about it exactly -- a
 * disagreement is a list that fetches people and then hides them.
 */

/** Turns the box into a people search. */
export const MEMBER_PREFIX = "@";

/** Separates a person from the thing you want of theirs. */
export const MEMBER_DRILL = "/";

export type SpotlightQuery =
  /** Ordinary page navigation, unchanged from before any of this. */
  | { mode: "pages"; term: string }
  /** `@`, or `@ann`: which person. */
  | { mode: "people"; term: string }
  /** `@ann/`, or `@ann/inv`: which of that person's pages. */
  | { mode: "person"; username: string; term: string };

export function parseSpotlightQuery(raw: string): SpotlightQuery {
  const query = raw.trim();

  if (!query.startsWith(MEMBER_PREFIX)) {
    return { mode: "pages", term: query.toLowerCase() };
  }

  const rest = query.slice(MEMBER_PREFIX.length);
  const slash = rest.indexOf(MEMBER_DRILL);

  // No slash yet, so they are still choosing a person.
  if (slash === -1) return { mode: "people", term: rest };

  const username = rest.slice(0, slash);
  // `@/` is nobody. Treated as still choosing, rather than as a person whose
  // name is the empty string.
  if (!username) return { mode: "people", term: "" };

  return {
    mode: "person",
    username,
    term: rest.slice(slash + MEMBER_DRILL.length).toLowerCase(),
  };
}

/** The query that drills into one person, ready to be typed into the box. */
export const drillQuery = (username: string) =>
  `${MEMBER_PREFIX}${username}${MEMBER_DRILL}`;
