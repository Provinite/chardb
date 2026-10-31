import { Children, isValidElement, type ReactNode } from "react";
import { createRoutesFromChildren, matchRoutes } from "react-router-dom";
import { currentCommunitySlug } from "../lib/communityHost";
import { apexRoutes } from "./ApexRoutes";
import { communityRoutes } from "./CommunityRoutes";
import type { LazyPage } from "./lazyPage";

const isLazyPage = (type: unknown): type is LazyPage<object> =>
  typeof type === "object" &&
  type !== null &&
  typeof (type as { preload?: unknown }).preload === "function";

/** Every lazy page in an element tree: the page, or one wrapped in a guard. */
const lazyPagesIn = (node: ReactNode): LazyPage<object>[] =>
  Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return isLazyPage(child.type)
      ? [child.type]
      : lazyPagesIn(child.props.children);
  });

/**
 * Starts downloading the page that `routes` render at `pathname`. A failure
 * is ignored: rendering the page imports it again, and that import's failure
 * is the one that is handled.
 */
export const preloadMatchedPage = (routes: ReactNode, pathname: string) => {
  const matches = matchRoutes(createRoutesFromChildren(routes), pathname);
  const element = matches?.[matches.length - 1]?.route.element;
  for (const page of lazyPagesIn(element)) {
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
