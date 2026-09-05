import type {
  SpotlightActionData,
  SpotlightActionGroupData,
  SpotlightFilterFunction,
} from "@mantine/spotlight";
import { MEMBER_INVENTORY_GROUP, MEMBER_PREFIX } from "./useSpotlightActions";

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

/**
 * Mantine's own filter, with `@` switching the box to people.
 *
 * The box answers one question at a time. A query opening with `@` is about
 * people, and returns the member group alone -- unfiltered, because it is
 * already the answer: the server matched it against display names and
 * usernames both, and substring-matching it again here would drop the person
 * you were looking for whenever what you typed matched their username while
 * the label shows their display name. Any other query is about pages, and the
 * member group is dropped rather than left standing from a moment ago.
 *
 * Not `defaultSpotlightFilter`, because @mantine/spotlight does not export it.
 */
export const filterKeepingMembers: SpotlightFilterFunction = (
  rawQuery,
  data,
) => {
  const query = rawQuery.trim().toLowerCase();
  const members: Item[] = [];
  const pages: Item[] = [];

  for (const item of data as Item[]) {
    if (isGroup(item) && item.group === MEMBER_INVENTORY_GROUP) {
      members.push(item);
    } else {
      pages.push(item);
    }
  }

  if (query.startsWith(MEMBER_PREFIX)) return members;

  return pages.reduce<Item[]>((acc, item) => {
    if (!isGroup(item)) {
      if (matches(item, query)) acc.push(item);
      return acc;
    }
    const actions = item.actions.filter((action) => matches(action, query));
    if (actions.length > 0) acc.push({ ...item, actions });
    return acc;
  }, []);
};
