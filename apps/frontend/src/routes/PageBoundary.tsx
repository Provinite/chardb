import { Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { RouteFallback } from "./RouteFallback";

/**
 * Where the route table renders: a Suspense boundary for pages still loading,
 * holding an error boundary for pages that fail.
 *
 * One of these for every page, never one per route: a Suspense boundary that
 * mounts during a navigation shows its fallback at once, while one already on
 * screen lets the transition keep the old page up. The error boundary sits
 * inside for the same reason, since clearing an error on navigation remounts
 * whatever it wraps.
 */
export const PageBoundary: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { pathname } = useLocation();
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouteErrorBoundary resetKey={pathname}>{children}</RouteErrorBoundary>
    </Suspense>
  );
};
