import { useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useCommunityHost } from "./contexts/CommunityHostContext";
import { apexUrl } from "./lib/communityHost";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ScrollToTop } from "./components/ScrollToTop";
import { ApexRoutes } from "./routes/ApexRoutes";
import { CommunityRoutes } from "./routes/CommunityRoutes";
import { CommunityUnreachable } from "./pages/CommunityUnreachable";

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

  if (isUnknownHost) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // The lookup failed rather than answering. Say that, and nothing else: this
  // is not "no such community", and telling somebody their address is wrong
  // when the server is down sends them to check a URL that was fine.
  if (unreachable) {
    return <CommunityUnreachable />;
  }

  if (authLoading || hostLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Layout>
      <ScrollToTop />
      {community ? <CommunityRoutes /> : <ApexRoutes />}
    </Layout>
  );
}

export default App;
