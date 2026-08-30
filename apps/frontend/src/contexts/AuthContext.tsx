import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ApolloError, useApolloClient } from "@apollo/client";
import { toast } from "react-hot-toast";
import {
  useLoginMutation,
  useSignupMutation,
  useMeQuery,
  useRefreshTokenMutation,
  type MeQuery,
} from "../generated/graphql";

type User = MeQuery["me"];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (
    username: string,
    email: string,
    password: string,
    displayName?: string,
    inviteCode?: string,
  ) => Promise<boolean>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * The message to show when an auth mutation fails.
 *
 * Apollo reports a rejected mutation and a transport failure on different
 * properties, and a thrown value is not guaranteed to be either, so each shape
 * is narrowed rather than reached through with optional chaining.
 */
function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApolloError) {
    return (
      error.graphQLErrors[0]?.message ||
      error.networkError?.message ||
      error.message ||
      fallback
    );
  }
  return error instanceof Error ? error.message : fallback;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const apolloClient = useApolloClient();

  const [loginMutation] = useLoginMutation();
  const [signupMutation] = useSignupMutation();
  const [refreshTokenMutation] = useRefreshTokenMutation();

  const {
    data: meData,
    loading: meLoading,
    refetch: refetchMe,
  } = useMeQuery({
    skip: !localStorage.getItem("accessToken"),
    errorPolicy: "ignore",
  });

  useEffect(() => {
    if (meData?.me) {
      setUser(meData.me);
    }
    setLoading(meLoading);
  }, [meData, meLoading]);

  useEffect(() => {
    // Try to refresh token on app load
    const refreshToken = localStorage.getItem("refreshToken");
    const accessToken = localStorage.getItem("accessToken");

    if (refreshToken && !user) {
      refreshAccessToken();
    } else if (!accessToken) {
      // Nothing to restore: `me` is skipped without an access token, so no
      // request is in flight and there is nothing left to wait for.
      setLoading(false);
    }
    // An access token with no refresh token is a real state -- refresh tokens
    // last 7 days while access tokens last 24 hours, so a long-lived session
    // outlives its refresh token. `me` is in flight for it, and the effect
    // above clears `loading` when that settles. Calling setLoading(false) here
    // would report "not loading, no user" before the query resolves, and
    // ProtectedRoute would bounce a perfectly valid session to /login.
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const { data } = await loginMutation({
          variables: { input: { email, password } },
        });

        if (data?.login) {
          localStorage.setItem("accessToken", data.login.accessToken);
          localStorage.setItem("refreshToken", data.login.refreshToken);
          // Fetch user data via authenticated 'me' query
          await refetchMe();
          toast.success("Welcome back!");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Login error:", error);
        toast.error(authErrorMessage(error, "Login failed"));
        return false;
      }
    },
    [loginMutation, refetchMe],
  );

  const signup = useCallback(
    async (
      username: string,
      email: string,
      password: string,
      displayName?: string,
      inviteCode?: string,
    ): Promise<boolean> => {
      try {
        const { data } = await signupMutation({
          variables: {
            input: {
              username,
              email,
              password,
              displayName,
              inviteCode: inviteCode || "",
            },
          },
        });

        if (data?.signup) {
          localStorage.setItem("accessToken", data.signup.accessToken);
          localStorage.setItem("refreshToken", data.signup.refreshToken);
          // Fetch user data via authenticated 'me' query
          await refetchMe();
          toast.success("Account created successfully!");
          return true;
        }
        return false;
      } catch (error) {
        console.error("Signup error:", error);
        toast.error(authErrorMessage(error, "Signup failed"));
        return false;
      }
    },
    [signupMutation, refetchMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);

    // Every cached query was answered for the person who just left. Without
    // this, the next person to sign in on this browser renders the previous
    // user's data from cache while the network reply is in flight -- their
    // notifications, their liked characters, their `me`. Tokens being gone does
    // not help, because a cache hit never reaches the network.
    //
    // clearStore, not resetStore: resetStore refetches every active query, and
    // the queries active at this moment belong to a session that has ended.
    void apolloClient.clearStore();

    toast.success("Logged out successfully");
  }, [apolloClient]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const { data } = await refreshTokenMutation({
        variables: { token: refreshToken },
      });

      if (data?.refreshToken) {
        localStorage.setItem("accessToken", data.refreshToken);
        // Refetch user data
        await refetchMe();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return false;
    }
  }, [refreshTokenMutation, refetchMe, logout]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshAccessToken,
    }),
    [user, loading, login, signup, logout, refreshAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
