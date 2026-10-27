import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { loginUrlReturningHere } from "../lib/communityHost";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    // The return address goes in the URL, not in router state. On a community
    // host `/login` is itself a hop to the apex, and `location.state` does not
    // survive a navigation across origins -- carrying it that way stranded
    // people on the apex dashboard instead of the page they asked for.
    return <Navigate to={loginUrlReturningHere()} replace />;
  }

  return <>{children}</>;
};
