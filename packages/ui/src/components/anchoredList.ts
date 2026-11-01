import type { RefObject } from "react";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";

/** Pixels between the input and its list. */
const GAP_PX = 4;
/** Pixels the list keeps from the viewport's edges. */
const MARGIN_PX = 8;
/** The tallest a list grows before it scrolls; its CSS caps it the same. */
export const LIST_MAX_HEIGHT_PX = 300;

/**
 * Keeps a typeahead's list under its input, as wide as the input, or above
 * it when there is no room below. For a list rendered into the portal
 * container with `position: fixed`, which nothing on the page can clip.
 */
export function useAnchoredList(
  anchor: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useAnchoredPosition(anchor, list, open, {
    side: "bottom",
    align: "start",
    gap: GAP_PX,
    margin: MARGIN_PX,
    // Past the cap `apply` sets, so the cap never decides the side.
    measure: (el) => ({
      width: anchor.current?.offsetWidth ?? el.offsetWidth,
      height: Math.min(el.scrollHeight, LIST_MAX_HEIGHT_PX),
    }),
    // Straight to the element, so following a scroll re-renders nothing.
    apply: ({ top, left, maxHeight }) => {
      const el = list.current;
      const a = anchor.current;
      if (!el || !a) return;
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
      el.style.width = `${a.getBoundingClientRect().width}px`;
      el.style.maxHeight = `${Math.min(maxHeight, LIST_MAX_HEIGHT_PX)}px`;
    },
  });
}
