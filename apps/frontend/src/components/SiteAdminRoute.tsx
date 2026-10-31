import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { NotFoundPage } from "../routes/pages";
import { ProtectedRoute } from "./ProtectedRoute";
import type { isSiteAdmin } from "../lib/siteAdminAccess";

interface SiteAdminRouteProps {
  /** Who may open this page; one of the predicates in `siteAdminAccess`. */
  allow: typeof isSiteAdmin;
  children: React.ReactNode;
}

/**
 * A site administration page (#405).
 *
 * Signed-out visitors go to log in, as with any protected page. Anyone else
 * the page does not allow gets not found rather than a forbidden message: the
 * server refuses them the data regardless, and there is no reason to tell
 * them the page exists. This is presentation, not security -- the resolvers'
 * own permission checks are what keep the data back.
 */
export const SiteAdminRoute: React.FC<SiteAdminRouteProps> = ({
  allow,
  children,
}) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user && allow(user) ? children : <NotFoundPage />}
    </ProtectedRoute>
  );
};
