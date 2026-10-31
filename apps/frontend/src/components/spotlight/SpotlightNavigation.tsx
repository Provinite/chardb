import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Spotlight,
  type SpotlightActionData,
  type SpotlightActionGroupData,
} from "@mantine/spotlight";
import { localPath } from "../../lib/communityHost";
import { filterKeepingMembers } from "./filterKeepingMembers";
import { parseSpotlightQuery } from "./spotlightQuery";
import {
  RESULT_LIMIT,
  SEARCH_PLACEHOLDER,
  nothingFoundText,
} from "./spotlightText";
import { isLink } from "./types";
import {
  useActiveCommunityId,
  useSpotlightActions,
} from "./useSpotlightActions";

const SEARCH_PROPS = { placeholder: SEARCH_PLACEHOLDER } as const;

const isGroup = (
  item: SpotlightActionData | SpotlightActionGroupData,
): item is SpotlightActionGroupData => "actions" in item;

/**
 * The page search on Mantine's Spotlight. Being replaced by
 * `PaletteNavigation` (#466), and goes with Mantine.
 */
export const SpotlightNavigation: React.FC = () => {
  // Controlled because the actions both depend on it and rewrite it: member
  // results are fetched for what has been typed, and picking a person appends
  // the slash that asks which of their pages you meant.
  const [query, setQuery] = useState("");
  const groups = useSpotlightActions(query, setQuery);
  const parsed = parseSpotlightQuery(query);
  const inCommunity = !!useActiveCommunityId();
  const navigate = useNavigate();

  // Mantine's actions are click handlers, so each destination becomes one: a
  // route on this host, a page load on another.
  const actions = useMemo<SpotlightActionGroupData[]>(
    () =>
      groups.map(({ group, actions: items }) => ({
        group,
        actions: items.map((item) => {
          const { id, label, description, keywords } = item;
          if (!isLink(item)) {
            return {
              id,
              label,
              description,
              keywords,
              onClick: item.onSelect,
              closeSpotlightOnTrigger: false,
            };
          }
          const path = localPath(item.to);
          return {
            id,
            label,
            description,
            keywords,
            onClick: () =>
              path !== null ? navigate(path) : window.location.assign(item.to),
          };
        }),
      })),
    [groups, navigate],
  );

  return (
    <Spotlight
      actions={actions}
      query={query}
      onQueryChange={setQuery}
      filter={(q, data) => filterKeepingMembers(q, data.filter(isGroup))}
      highlightQuery
      limit={RESULT_LIMIT}
      scrollable
      maxHeight={400}
      nothingFound={nothingFoundText(parsed, inCommunity)}
      searchProps={SEARCH_PROPS}
    />
  );
};
