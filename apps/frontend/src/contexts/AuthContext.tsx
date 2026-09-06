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
  useLogoutMutation,
  type MeQuery,
} from "../generated/graphql";
import { setAccessToken } from "../lib/accessToken";

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
  const [logoutMutation] = useLogoutMutation();

  /**
   * Whether an access token has been established for this tab.
   *
   * Nothing persists across a reload any more -- the access token is in
   * memory and the refresh token is a cookie the page cannot read -- so
   * "is there a session" is not a question that can be answered
   * synchronously. It is the result of the refresh below, and `me` waits
   * on it.
   */
  const [hasSession, setHasSession] = useState(false);

  const {
    data: meData,
    loading: meLoading,
    refetch: refetchMe,
  } = useMeQuery({
    skip: !hasSession,
    errorPolicy: "ignore",
  });

  useEffect(() => {
    // Guarded on `hasSession` because a skipped query reports `loading: false`
    // immediately. Without the guard this would clear `loading` on mount,
    // before the boot refresh has had a chance to run, and `ProtectedRoute`
    // would bounce a valid session to /login.
    if (!hasSession) return;
    if (meData?.me) {
      setUser(meData.me);
    }
    setLoading(meLoading);
  }, [hasSession, meData, meLoading]);

  useEffect(() => {
    // Every page load starts with no access token, so the only way to find out
    // whether this browser is signed in is to ask: the refresh cookie either
    // buys a new access token or it does not.
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await refreshTokenMutation();
        if (data?.refreshToken) {
          setAccessToken(data.refreshToken);
          if (!cancelled) setHasSession(true);
          return;
        }
      } catch {
        // No cookie, or one the server will not honour. Either way this is an
        // ordinary signed-out visitor, not an error worth reporting.
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTokenMutation]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const { data } = await loginMutation({
          variables: { input: { email, password } },
        });

        if (data?.login) {
          setAccessToken(data.login.accessToken);
          setHasSession(true);
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
          setAccessToken(data.signup.accessToken);
          setHasSession(true);
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
    setAccessToken(null);
    setHasSession(false);
    setUser(null);
    setLoading(false);

    // The refresh cookie is HttpOnly, so clearing it is the server's job.
    // Fire-and-forget: the local session is already gone either way, and a
    // failed call must not leave the user looking signed in.
    void logoutMutation().catch(() => undefined);

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
  }, [apolloClient, logoutMutation]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const { data } = await refreshTokenMutation();

      if (data?.refreshToken) {
        setAccessToken(data.refreshToken);
        setHasSession(true);
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
