import type {
  SpotlightActionData,
  SpotlightActionGroupData,
  SpotlightFilterFunction,
} from "@mantine/spotlight";
import { MEMBER_GROUP, MEMBER_PAGES_GROUP } from "./useSpotlightActions";
import { parseSpotlightQuery } from "./spotlightQuery";

type Item = SpotlightActionData | SpotlightActionGroupData;

const isGroup = (item: Item): item is SpotlightActionGroupData =>
  "actions" in item;

const matches = (action: SpotlightActionData, query: string) => {
  const keywords = Array.isArray(action.keywords)
    ? action.keywords.join(",")
    : (action.keywords ?? "");
  return (
    !!action.label?.toLowerCase().includes(query) ||
    !!action.description?.toLowerCase().includes(query) ||
    keywords.toLowerCase().includes(query)
  );
};

const narrow = (items: Item[], term: string): Item[] =>
  items.reduce<Item[]>((acc, item) => {
    if (!isGroup(item)) {
      if (matches(item, term)) acc.push(item);
      return acc;
    }
    const actions = item.actions.filter((action) => matches(action, term));
    if (actions.length > 0) acc.push({ ...item, actions });
    return acc;
  }, []);

/**
 * Mantine's own filter, made to agree with the three things the box can be
 * asked. Each mode shows one group and hides the other two, so the list is
 * never half an answer to a question and half an answer to the one before it.
 *
 * The people group is the exception to filtering: it is already the answer,
 * matched server-side against display names and usernames both, and matching
 * it again here would drop the person you were looking for whenever what you
 * typed hit their username while the label shows their display name. A
 * person's own pages are a fixed handful and filter normally, against the
 * text after the slash rather than the whole query.
 *
 * Not `defaultSpotlightFilter`, because @mantine/spotlight does not export it.
 */
export const filterKeepingMembers: SpotlightFilterFunction = (
  rawQuery,
  data,
) => {
  const parsed = parseSpotlightQuery(rawQuery);
  const items = data as Item[];
  const inGroup = (name: string) => (item: Item) =>
    isGroup(item) && item.group === name;

  if (parsed.mode === "people") return items.filter(inGroup(MEMBER_GROUP));

  if (parsed.mode === "person") {
    return narrow(items.filter(inGroup(MEMBER_PAGES_GROUP)), parsed.term);
  }

  const pages = items.filter(
    (item) =>
      !inGroup(MEMBER_GROUP)(item) && !inGroup(MEMBER_PAGES_GROUP)(item),
  );
  return narrow(pages, parsed.term);
};
