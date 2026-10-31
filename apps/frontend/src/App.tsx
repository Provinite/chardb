import { Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useCommunityHost } from "./contexts/CommunityHostContext";
import { apexUrl } from "./lib/communityHost";
import { Layout } from "./components/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { useHoldBootScreen } from "./hooks/useBootScreen";
import { ApexRoutes } from "./routes/ApexRoutes";
import { CommunityRoutes } from "./routes/CommunityRoutes";
import { RouteFallback } from "./routes/RouteFallback";
import { RouteErrorBoundary } from "./routes/RouteErrorBoundary";
import { CommunityUnreachable } from "./routes/pages";

/**
 * Picks the route table from the hostname.
 *
 * The app serves two different sites from one bundle: the apex, which is the
 * person's and the site's, and a community, which is one community's and
 * nothing else's. Which one is decided before the router sees anything, by
 * `CommunityHostProvider` reading `window.location.hostname` -- so unlike the
 * pathname-regex arrangement it replaces (#293, #339), community context is
 * never briefly unknown while a lookup lands.
 *
 * The two tables live in `routes/`; the split between them is documented
 * there.
 */
function App() {
  const { pathname } = useLocation();
  const { loading: authLoading } = useAuth();
  const {
    community,
    isUnknownHost,
    unreachable,
    loading: hostLoading,
  } = useCommunityHost();

  // An address that names no community -- a typo, a deleted community, a label
  // that could never have been a slug. The wildcard record answers for every
  // one of them, so they are all reachable; none of them is a place. Send them
  // to the apex without comment rather than explaining a URL nobody meant to
  // type.
  useEffect(() => {
    if (isUnknownHost) window.location.replace(apexUrl("/"));
  }, [isUnknownHost]);
  useHoldBootScreen(isUnknownHost);

  // Rendering nothing below leaves the startup screen in index.html up. It is
  // dismissed by the first thing rendered once startup has resolved: Layout,
  // or CommunityUnreachable.
  if (isUnknownHost) {
    return null;
  }

  // The lookup failed rather than answering. Say that, and nothing else: this
  // is not "no such community", and telling somebody their address is wrong
  // when the server is down sends them to check a URL that was fine.
  if (unreachable) {
    return (
      <RouteErrorBoundary resetKey={pathname}>
        <Suspense fallback={<RouteFallback />}>
          <CommunityUnreachable />
        </Suspense>
      </RouteErrorBoundary>
    );
  }

  if (authLoading || hostLoading) {
    return null;
  }

  return (
    <Layout>
      <ScrollToTop />
      {/* One boundary for every page, never one per route: a boundary that
          mounts during a navigation shows its fallback at once, while one
          already on screen lets the transition keep the old page up. */}
      <RouteErrorBoundary resetKey={pathname}>
        <Suspense fallback={<RouteFallback />}>
          {community ? <CommunityRoutes /> : <ApexRoutes />}
        </Suspense>
      </RouteErrorBoundary>
    </Layout>
  );
}

export default App;
