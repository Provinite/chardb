import { MEMBER_GROUP, MEMBER_PAGES_GROUP } from "./useSpotlightActions";
import { parseSpotlightQuery } from "./spotlightQuery";

/**
 * What the filter reads of a result. Loose enough for Mantine's actions as
 * well as ours while both implementations ship (#466).
 */
interface Matchable {
  label?: string;
  description?: string;
  keywords?: string | string[];
}

interface GroupOf<T> {
  group: string;
  actions: T[];
}

const matches = (action: Matchable, query: string) => {
  const keywords = Array.isArray(action.keywords)
    ? action.keywords.join(",")
    : (action.keywords ?? "");
  return (
    !!action.label?.toLowerCase().includes(query) ||
    !!action.description?.toLowerCase().includes(query) ||
    keywords.toLowerCase().includes(query)
  );
};

const narrow = <T extends Matchable>(
  groups: GroupOf<T>[],
  term: string,
): GroupOf<T>[] =>
  groups.reduce<GroupOf<T>[]>((acc, group) => {
    const actions = group.actions.filter((action) => matches(action, term));
    if (actions.length > 0) acc.push({ ...group, actions });
    return acc;
  }, []);

/**
 * Narrows the results to what was typed, agreeing with the three things the
 * box can be asked. Each mode shows one group and hides the other two, so the
 * list is never half an answer to a question and half an answer to the one
 * before it.
 *
 * The people group is the exception to filtering: it is already the answer,
 * matched server-side against display names and usernames both, and matching
 * it again here would drop the person you were looking for whenever what you
 * typed hit their username while the label shows their display name. A
 * person's own pages are a fixed handful and filter normally, against the
 * text after the slash rather than the whole query.
 */
export function filterKeepingMembers<T extends Matchable>(
  rawQuery: string,
  groups: GroupOf<T>[],
): GroupOf<T>[] {
  const parsed = parseSpotlightQuery(rawQuery);
  const inGroup = (name: string) => (group: GroupOf<T>) => group.group === name;

  if (parsed.mode === "people") return groups.filter(inGroup(MEMBER_GROUP));

  if (parsed.mode === "person") {
    return narrow(groups.filter(inGroup(MEMBER_PAGES_GROUP)), parsed.term);
  }

  const pages = groups.filter(
    (group) =>
      !inGroup(MEMBER_GROUP)(group) && !inGroup(MEMBER_PAGES_GROUP)(group),
  );
  return narrow(pages, parsed.term);
}
