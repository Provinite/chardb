import React, { useState } from "react";
import { Spotlight } from "@mantine/spotlight";
import { filterKeepingMembers } from "./filterKeepingMembers";
import { parseSpotlightQuery } from "./spotlightQuery";
import {
  useActiveCommunityId,
  useSpotlightActions,
} from "./useSpotlightActions";

// The hint is the feature. A people search nobody knows the sigil for is the
// same unfindable inventory this replaced (#349).
const SEARCH_PROPS = {
  placeholder: "Search pages, or @ for members...",
} as const;

export const SpotlightNavigation: React.FC = () => {
  // Controlled because the actions both depend on it and rewrite it: member
  // results are fetched for what has been typed, and picking a person appends
  // the slash that asks which of their pages you meant.
  const [query, setQuery] = useState("");
  const actions = useSpotlightActions(query, setQuery);
  const parsed = parseSpotlightQuery(query);
  const inCommunity = !!useActiveCommunityId();

  // Answering the question that was asked. "No pages found" to someone who
  // typed a person's name reads as the person not existing -- and "nobody by
  // that name" reads the same way to someone who is not in a community at all,
  // where there is no membership to search.
  const nothingFound =
    parsed.mode === "pages"
      ? "No pages found... try @ for members"
      : !inCommunity
        ? "Open a community to search its members"
        : parsed.mode === "people"
          ? "Nobody here by that name..."
          : "No pages of theirs match that...";

  return (
    <Spotlight
      actions={actions}
      query={query}
      onQueryChange={setQuery}
      filter={filterKeepingMembers}
      highlightQuery
      limit={7}
      scrollable
      maxHeight={400}
      nothingFound={nothingFound}
      searchProps={SEARCH_PROPS}
    />
  );
};
