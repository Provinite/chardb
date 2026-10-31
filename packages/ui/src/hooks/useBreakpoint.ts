import { useCallback, useSyncExternalStore } from "react";
import type { Breakpoint } from "../css/breakpoints";
import { mq } from "../css/media";

/**
 * Whether the viewport is at least `bp` wide, kept up to date as it resizes.
 * For choosing what to render; layout belongs in CSS. Known on the first
 * render, so nothing swaps in after the page has painted.
 */
export const useBreakpoint = (bp: Breakpoint): boolean => {
  const query = mq(bp);
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
};
