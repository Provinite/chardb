import React, { useState } from "react";
import {
  Spotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
  type SpotlightFilterFunction,
} from "@mantine/spotlight";
import {
  MEMBER_INVENTORY_GROUP,
  useSpotlightActions,
} from "./useSpotlightActions";

const SEARCH_PROPS = { placeholder: "Search pages and members..." } as const;

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
 * Mantine's own filter, with one group exempted.
 *
 * The member group is already the answer to the query -- the server matched
 * it, against display names and usernames both. Substring-matching it a second
 * time here would drop the person you were looking for whenever the thing you
 * typed matched their username and the label shows their display name.
 * Everything else is a static list of pages and still needs narrowing.
 *
 * Not `defaultSpotlightFilter`, because @mantine/spotlight does not export it.
 */
export const filterKeepingMembers: SpotlightFilterFunction = (
  rawQuery,
  data,
) => {
  const query = rawQuery.trim().toLowerCase();
  const members: Item[] = [];
  const rest: Item[] = [];

  for (const item of data as Item[]) {
    if (isGroup(item) && item.group === MEMBER_INVENTORY_GROUP) {
      members.push(item);
    } else {
      rest.push(item);
    }
  }

  const filtered = rest.reduce<Item[]>((acc, item) => {
    if (!isGroup(item)) {
      if (matches(item, query)) acc.push(item);
      return acc;
    }
    const actions = item.actions.filter((action) => matches(action, query));
    if (actions.length > 0) acc.push({ ...item, actions });
    return acc;
  }, []);

  return [...members, ...filtered];
};

export const SpotlightNavigation: React.FC = () => {
  // Controlled because the actions depend on it: member results are fetched
  // for what has been typed rather than filtered out of a fixed list.
  const [query, setQuery] = useState("");
  const actions = useSpotlightActions(query);

  return (
    <Spotlight
      actions={actions}
      query={query}
      onQueryChange={setQuery}
      filter={filterKeepingMembers}
      highlightQuery
      // Raised from 7 to leave room for both: member matches sit above the
      // page matches and would otherwise eat most of the list.
      limit={12}
      scrollable
      maxHeight={400}
      nothingFound="No pages or members found..."
      searchProps={SEARCH_PROPS}
    />
  );
};
