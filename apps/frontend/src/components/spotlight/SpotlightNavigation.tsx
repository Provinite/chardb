import React, { useState } from "react";
import { Spotlight } from "@mantine/spotlight";
import { filterKeepingMembers } from "./filterKeepingMembers";
import {
  MEMBER_PREFIX,
  useActiveCommunityId,
  useSpotlightActions,
} from "./useSpotlightActions";

// The hint is the feature. A people search nobody knows the sigil for is the
// same unfindable inventory this replaced (#349).
const SEARCH_PROPS = {
  placeholder: "Search pages, or @ for members...",
} as const;

export const SpotlightNavigation: React.FC = () => {
  // Controlled because the actions depend on it: member results are fetched
  // for what has been typed rather than filtered out of a fixed list.
  const [query, setQuery] = useState("");
  const actions = useSpotlightActions(query);
  const askingForPeople = query.trim().startsWith(MEMBER_PREFIX);
  const inCommunity = !!useActiveCommunityId();

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
      // Answering the question that was asked. "No pages found" to someone who
      // typed a person's name reads as the person not existing -- and "nobody
      // by that name" reads the same way to someone who is not in a community
      // at all, where there is no membership to search.
      nothingFound={
        !askingForPeople
          ? "No pages found... try @ for members"
          : inCommunity
            ? "Nobody here by that name..."
            : "Open a community to search its members"
      }
      searchProps={SEARCH_PROPS}
    />
  );
};
