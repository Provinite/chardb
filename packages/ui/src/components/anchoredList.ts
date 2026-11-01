import { useLayoutEffect, type RefObject } from "react";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";

/** Pixels between the input and its list. */
const GAP_PX = 4;
/** Pixels the list keeps from the viewport's edges. */
const MARGIN_PX = 8;
/** The tallest a list grows before it scrolls, unless it says otherwise. */
export const LIST_MAX_HEIGHT_PX = 300;

/**
 * Keeps a typeahead's list under its input, as wide as the input, or above
 * it when there is no room below. For a list rendered into the portal
 * container with `position: fixed`, which nothing on the page can clip.
 * `maxHeight` matches the cap in the list's own CSS.
 */
export function useAnchoredList(
  anchor: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  open: boolean,
  maxHeight = LIST_MAX_HEIGHT_PX,
): void {
  useAnchoredPosition(anchor, list, open, {
    side: "bottom",
    align: "start",
    gap: GAP_PX,
    margin: MARGIN_PX,
    // Past the cap `apply` sets, so the cap never decides the side.
    measure: (el) => ({
      width: anchor.current?.offsetWidth ?? el.offsetWidth,
      height: Math.min(el.scrollHeight, maxHeight),
    }),
    // Straight to the element, so following a scroll re-renders nothing.
    // Writes only: a read here would force a layout on every scroll step.
    apply: (p) => {
      const el = list.current;
      if (!el) return;
      el.style.top = `${p.top}px`;
      el.style.left = `${p.left}px`;
      el.style.maxHeight = `${Math.min(p.maxHeight, maxHeight)}px`;
    },
  });

  // The width on its own: an input can narrow without moving (a scrollbar
  // appearing beside it), which changes no placement and so calls no
  // `apply`. The observer hands over the size it measured.
  useLayoutEffect(() => {
    if (!open) return;
    const a = anchor.current;
    const el = list.current;
    if (!a || !el) return;
    el.style.width = `${a.offsetWidth}px`;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const size = entry?.borderBoxSize?.[0]?.inlineSize;
      if (size !== undefined && list.current) {
        list.current.style.width = `${size}px`;
      }
    });
    observer.observe(a);
    return () => observer.disconnect();
  }, [open, anchor, list]);
}
