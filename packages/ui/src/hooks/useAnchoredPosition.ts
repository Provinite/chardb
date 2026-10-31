import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
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
}

const same = (a: Placement | null, b: Placement) =>
  !!a &&
  a.top === b.top &&
  a.left === b.left &&
  a.side === b.side &&
  a.arrow === b.arrow;

/**
 * Where to put something floating beside `anchor` while `open`, as viewport
 * coordinates for `position: fixed`: on the asked side unless there is no
 * room, slid along it to stay on screen. See `placeFloating`.
 *
 * Worked out before paint, so it never flashes in the wrong place, and again
 * whenever the page scrolls (any scroller), the window resizes, or it changes
 * size itself. Fixed, it follows the anchor rather than closing on a scroll:
 * scroll anchoring fires scrolls nobody made, such as when an image above the
 * anchor finishes loading.
 */
export function useAnchoredPosition(
  anchor: RefObject<HTMLElement | null>,
  floating: RefObject<HTMLElement | null>,
  open: boolean,
  { side, align, gap = 8, margin = 8, arrowInset = 0 }: AnchoredOptions,
): Placement | null {
  const [placement, setPlacement] = useState<Placement | null>(null);
  const placementRef = useRef(placement);

  const place = useCallback(() => {
    const a = anchor.current;
    const f = floating.current;
    if (!a || !f) return;
    const next = placeFloating({
      anchor: a.getBoundingClientRect(),
      floating: { width: f.offsetWidth, height: f.offsetHeight },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      side,
      align,
      gap,
      margin,
      arrowInset,
    });
    // Scroll fires many times a second; an unchanged position must not
    // re-render. Compared against a ref, not inside the updater: React can
    // still render once for an updater that returns the old state.
    if (same(placementRef.current, next)) return;
    placementRef.current = next;
    setPlacement(next);
  }, [anchor, floating, side, align, gap, margin, arrowInset]);

  useLayoutEffect(() => {
    if (open) {
      place();
    } else if (placementRef.current) {
      placementRef.current = null;
      setPlacement(null);
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
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
  }, [open, place, anchor, floating]);

  return open ? placement : null;
}
