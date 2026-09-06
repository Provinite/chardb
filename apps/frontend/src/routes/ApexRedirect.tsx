import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { apexUrl } from "../lib/communityHost";

/**
 * Sends the current path to the site's apex host, keeping query and hash.
 *
 * Used for the paths that only exist at the apex but are reachable from a
 * community host by a stale link or a hand-edited URL. Signing in is the case
 * that matters: the refresh cookie is set for the whole parent domain, so the
 * sign-in has to happen there and then covers every community too.
 *
 * A whole-page navigation rather than a router `<Navigate>`, because the
 * destination is a different origin -- the router cannot reach it.
 */
export const ApexRedirect: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    window.location.replace(
      apexUrl(`${location.pathname}${location.search}${location.hash}`),
    );
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
};
