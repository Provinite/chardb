import { useHoldBootScreen } from "../hooks/useBootScreen";

/**
 * What the route table shows while a page's code is still downloading.
 *
 * Only a cold load ever renders it: navigations between pages are
 * transitions (see `TransitionRouter`), so React keeps the previous page on
 * screen instead. On a cold load it holds the startup screen, so the shell and
 * the first page appear together rather than the shell with an empty middle.
 * After startup the hold is a no-op: the screen is gone and never comes back.
 */
export const RouteFallback: React.FC = () => {
  useHoldBootScreen(true);
  return null;
};
