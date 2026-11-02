import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginUrlReturningHere } from "../lib/communityHost";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // App waits for auth before rendering any route, under the startup screen,
  // so this only covers a re-check after startup.
  if (loading) {
    return null;
  }

  if (!user) {
    // The return address goes in the URL, not in router state: it names the
    // host as well as the path, so it still works when the sign-in form is
    // reached from another host.
    return <Navigate to={loginUrlReturningHere()} replace />;
  }

  return <>{children}</>;
};
