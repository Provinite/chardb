import { useAuth } from "./contexts/AuthContext";
import { useCommunityHost } from "./contexts/CommunityHostContext";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ScrollToTop } from "./components/ScrollToTop";
import { ApexRoutes } from "./routes/ApexRoutes";
import { CommunityRoutes } from "./routes/CommunityRoutes";
import { UnknownCommunityPage } from "./pages/UnknownCommunityPage";

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
  const { slug, community, loading: hostLoading } = useCommunityHost();

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
      {slug === null ? (
        <ApexRoutes />
      ) : community ? (
        <CommunityRoutes />
      ) : (
        // A subdomain the wildcard record answered for but no community holds.
        <UnknownCommunityPage slug={slug} />
      )}
    </Layout>
  );
}

export default App;
