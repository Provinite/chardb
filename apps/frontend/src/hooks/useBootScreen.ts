import { useEffect, useLayoutEffect, useRef } from "react";
import {
  dismissBootScreen,
  holdBootScreen,
  releaseBootScreen,
} from "../lib/bootScreen";

/** For the first thing the app renders once startup has resolved. */
export const useDismissBootScreen = (): void => {
  useEffect(() => {
    dismissBootScreen();
  }, []);
};

/**
 * Keeps the startup screen up while `leaving` is true, for pages that send the
 * browser to another origin. If `leaving` turns false after this component
 * held the screen, the page is staying, so the hold is released and the screen
 * dismissed. A layout effect, so it runs before any passive effect in the same
 * commit, including the dismissal in `Layout`.
 */
export const useHoldBootScreen = (leaving: boolean): void => {
  const holding = useRef(false);
  useLayoutEffect(() => {
    if (leaving) {
      holding.current = true;
      holdBootScreen();
    } else if (holding.current) {
      holding.current = false;
      releaseBootScreen();
    }
  }, [leaving]);
};
