import React, { useState } from "react";
import { Spotlight } from "@mantine/spotlight";
import { filterKeepingMembers } from "./filterKeepingMembers";
import { useSpotlightActions } from "./useSpotlightActions";

const SEARCH_PROPS = { placeholder: "Search pages and members..." } as const;

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
