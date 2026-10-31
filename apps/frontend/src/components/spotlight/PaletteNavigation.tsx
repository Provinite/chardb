import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette, Highlight } from "@chardb/ui";
import { HostAwareLink } from "../HostAwareLink";
import { filterKeepingMembers } from "./filterKeepingMembers";
import { parseSpotlightQuery } from "./spotlightQuery";
import {
  RESULT_LIMIT,
  SEARCH_PLACEHOLDER,
  isPaletteShortcut,
  limitResults,
  nothingFoundText,
} from "./spotlightText";
import { isLink, type SpotlightItem } from "./types";
import {
  useActiveCommunityId,
  useSpotlightActions,
} from "./useSpotlightActions";

interface PaletteNavigationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The page search: Mod+K, or the search button in either sidebar.
 *
 * Every page is a link, so it opens in a new tab like any other; picking a
 * person narrows the search to their pages instead of leaving.
 */
export const PaletteNavigation: React.FC<PaletteNavigationProps> = ({
  open,
  onOpenChange,
}) => {
  // Controlled because the actions both depend on it and rewrite it: member
  // results are fetched for what has been typed, and picking a person appends
  // the slash that asks which of their pages you meant.
  const [query, setQuery] = useState("");
  const { groups, pending } = useSpotlightActions(query, setQuery);
  const parsed = parseSpotlightQuery(query);
  const inCommunity = !!useActiveCommunityId();

  // Filtered by what is in the box now, so nothing from the previous question
  // stays up once the box has changed mode: switching to `@` empties the list
  // until the members arrive, rather than leaving pages to be picked.
  const shown = useMemo(
    () => limitResults(filterKeepingMembers(query, groups), RESULT_LIMIT),
    [query, groups],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      // Chrome's own Ctrl+K moves focus to the address bar.
      e.preventDefault();
      onOpenChange(true);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // Opens empty every time: the last search is rarely the next one.
  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const body = ({ icon: Icon, label, description }: SpotlightItem) => (
    <>
      <CommandPalette.ItemIcon>
        <Icon size={20} />
      </CommandPalette.ItemIcon>
      <CommandPalette.ItemText>
        <CommandPalette.ItemLabel>
          <Highlight text={label} match={parsed.term} />
        </CommandPalette.ItemLabel>
        {description && (
          <CommandPalette.ItemDescription>
            {description}
          </CommandPalette.ItemDescription>
        )}
      </CommandPalette.ItemText>
    </>
  );

  return (
    <CommandPalette.Root open={open} onClose={close} aria-label="Search pages">
      <CommandPalette.Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          // Until the members for what was typed arrive, what is on screen
          // answers an earlier query; Enter would open the wrong thing.
          if (e.key === "Enter" && pending) e.preventDefault();
        }}
        placeholder={SEARCH_PLACEHOLDER}
      />
      <CommandPalette.List>
        {shown.length === 0 ? (
          <CommandPalette.Empty>
            {nothingFoundText(parsed, inCommunity, pending)}
          </CommandPalette.Empty>
        ) : (
          shown.map(({ group, actions }) => (
            <CommandPalette.Group key={group} heading={group}>
              {actions.map((item) =>
                isLink(item) ? (
                  <CommandPalette.Item
                    key={item.id}
                    as={HostAwareLink}
                    to={item.to}
                  >
                    {body(item)}
                  </CommandPalette.Item>
                ) : (
                  <CommandPalette.Item key={item.id} onClick={item.onSelect}>
                    {body(item)}
                  </CommandPalette.Item>
                ),
              )}
            </CommandPalette.Group>
          ))
        )}
      </CommandPalette.List>
      <CommandPalette.Footer>
        <span>
          <CommandPalette.Kbd>↑</CommandPalette.Kbd>{" "}
          <CommandPalette.Kbd>↓</CommandPalette.Kbd> to move
        </span>
        <span>
          <CommandPalette.Kbd>Enter</CommandPalette.Kbd> to open
        </span>
        <span>
          <CommandPalette.Kbd>@</CommandPalette.Kbd> for members
        </span>
        <span>
          <CommandPalette.Kbd>Esc</CommandPalette.Kbd> to close
        </span>
      </CommandPalette.Footer>
    </CommandPalette.Root>
  );
};
