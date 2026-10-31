import React, { useEffect, useMemo, useState } from "react";
import { CommandPalette, Highlight } from "@chardb/ui";
import { HostAwareLink } from "../HostAwareLink";
import { filterKeepingMembers } from "./filterKeepingMembers";
import { parseSpotlightQuery } from "./spotlightQuery";
import {
  RESULT_LIMIT,
  SEARCH_PLACEHOLDER,
  limitResults,
  nothingFoundText,
} from "./spotlightText";
import { isLink, type SpotlightItem } from "./types";
import { useHeldWhile } from "./useHeldWhile";
import {
  useActiveCommunityId,
  useSpotlightActions,
} from "./useSpotlightActions";

interface PaletteNavigationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Typing in these, Mod+K is theirs. */
const typingIn = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.isContentEditable);

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

  const filtered = useMemo(
    () => limitResults(filterKeepingMembers(query, groups), RESULT_LIMIT),
    [query, groups],
  );
  // Until the members for a people query arrive, the last results stay up:
  // otherwise the list flashes "nobody by that name" and then fills.
  const shown = useHeldWhile(filtered, pending);
  const highlight = useHeldWhile(parsed.term, pending);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "k" &&
        !typingIn(e.target)
      ) {
        // Chrome's own Ctrl+K moves focus to the address bar.
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  // Opens empty every time: the last search is rarely the next one.
  const close = () => {
    onOpenChange(false);
    setQuery("");
  };

  const body = (item: SpotlightItem) => (
    <>
      <CommandPalette.ItemLabel>
        <Highlight text={item.label} match={highlight} />
      </CommandPalette.ItemLabel>
      {item.description && (
        <CommandPalette.ItemDescription>
          {item.description}
        </CommandPalette.ItemDescription>
      )}
    </>
  );

  return (
    <CommandPalette.Root open={open} onClose={close} aria-label="Search pages">
      <CommandPalette.Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={SEARCH_PLACEHOLDER}
      />
      <CommandPalette.List>
        {shown.length === 0 ? (
          <CommandPalette.Empty>
            {nothingFoundText(parsed, inCommunity)}
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
