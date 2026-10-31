import { Children, isValidElement, type ReactNode } from "react";
import { createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { currentCommunitySlug } from "../lib/communityHost";
import { apexRoutes } from "./ApexRoutes";
import { communityRoutes } from "./CommunityRoutes";
/**
 * A component that can start loading a page's code: a lazy page itself, or a
 * route guard that names the page it may render (`CharacterHostGuard`).
 */
interface Preloadable {
  preload: () => Promise<unknown>;
}

const isPreloadable = (type: unknown): type is Preloadable =>
  (typeof type === "object" || typeof type === "function") &&
  type !== null &&
  typeof (type as { preload?: unknown }).preload === "function";

/** Every preloadable in an element tree: the page, or one inside a guard. */
const preloadablesIn = (node: ReactNode): Preloadable[] =>
  Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return isPreloadable(child.type)
      ? [child.type]
      : preloadablesIn(child.props.children);
  });

/**
 * Starts downloading the page that `routes` render at `pathname`. A failure
 * is ignored: rendering the page imports it again, and that import's failure
 * is the one that is handled.
 */
export const preloadMatchedPage = (routes: ReactNode, pathname: string) => {
  const matches = matchRoutes(createRoutesFromChildren(routes), pathname);
  const element = matches?.[matches.length - 1]?.route.element;
  for (const page of preloadablesIn(element)) {
    page.preload().catch(() => {});
  }
};

/**
 * Starts downloading the current page's code at startup. The route table only
 * renders once sign-in and the community lookup have answered, so without
 * this the page's chunk would wait for that round trip before starting.
 */
export const preloadCurrentPage = () =>
  preloadMatchedPage(
    currentCommunitySlug() ? communityRoutes : apexRoutes,
    window.location.pathname,
  );
