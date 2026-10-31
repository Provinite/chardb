import { useLayoutEffect, useRef, type RefObject } from "react";
import {
  placeFloating,
  type Align,
  type Placement,
  type Side,
} from "./placeFloating";

export interface AnchoredOptions {
  side: Side;
  align: Align;
  /** Pixels between the anchor and it. */
  gap?: number;
  /** Pixels it keeps from the viewport's edges. */
  margin?: number;
  /** How close to its corners an arrow may sit. */
  arrowInset?: number;
  /**
   * Puts it where it goes: writes the placement to the element (CSS
   * variables, `style`) rather than to React state, so following a scroll
   * re-renders nothing. Called only when the placement changes.
   */
  apply: (placement: Placement) => void;
  /**
   * Its natural size, before any cap `apply` set. Defaults to its offset
   * size, which is right for anything that is never capped. Something that
   * can be capped must measure past the cap: deciding by the capped size
   * would let the cap decide the side, and a new side means a new cap.
   */
  measure?: (el: HTMLElement) => { width: number; height: number };
}

const offsetSize = (el: HTMLElement) => ({
  width: el.offsetWidth,
  height: el.offsetHeight,
});

const same = (a: Placement | null, b: Placement) =>
  !!a &&
  a.top === b.top &&
  a.left === b.left &&
  a.side === b.side &&
  a.arrow === b.arrow &&
  a.maxWidth === b.maxWidth &&
  a.maxHeight === b.maxHeight;

/**
 * Keeps something floating beside `anchor` while `open`, in viewport
 * coordinates for `position: fixed`: on the asked side unless there is no
 * room, slid along it to stay on screen. See `placeFloating`.
 *
 * Placed before paint, so it never flashes in the wrong place, and again
 * whenever the page scrolls (any scroller), the window resizes, or either
 * element changes size. Fixed, it follows the anchor rather than closing on a
 * scroll: scroll anchoring fires scrolls nobody made, such as when an image
 * above the anchor finishes loading.
 */
export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null>,
  floating: RefObject<HTMLElement | null>,
  open: boolean,
  options: AnchoredOptions,
): void {
  // Options through a ref, so callers can pass inline objects and functions
  // without re-subscribing every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const last = useRef<Placement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      last.current = null;
      return;
    }

    const place = () => {
      const a = anchor.current;
      const f = floating.current;
      if (!a || !f) return;
      const {
        side,
        align,
        gap = 8,
        margin = 8,
        arrowInset = 0,
        apply,
        measure = offsetSize,
      } = optionsRef.current;
      const next = placeFloating({
        anchor: a.getBoundingClientRect(),
        floating: measure(f),
        viewport: { width: window.innerWidth, height: window.innerHeight },
        side,
        align,
        gap,
        margin,
        arrowInset,
      });
      // Scroll fires many times a second; an unchanged placement writes
      // nothing.
      if (same(last.current, next)) return;
      last.current = next;
      apply(next);
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    const resized =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    if (floating.current) resized?.observe(floating.current);
    if (anchor.current) resized?.observe(anchor.current);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      resized?.disconnect();
    };
  }, [open, anchor, floating]);
}
