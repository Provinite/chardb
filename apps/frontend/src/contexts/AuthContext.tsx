import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { toast } from 'react-hot-toast';
import { LOGIN_MUTATION, SIGNUP_MUTATION, ME_QUERY, REFRESH_TOKEN_MUTATION } from '../graphql/auth';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string, displayName?: string) => Promise<boolean>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_MUTATION);

  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(ME_QUERY, {
    skip: !localStorage.getItem('accessToken'),
    errorPolicy: 'ignore',
  });

  useEffect(() => {
    if (meData?.me) {
      setUser(meData.me);
    }
    setLoading(meLoading);
  }, [meData, meLoading]);

  useEffect(() => {
    // Try to refresh token on app load
    const token = localStorage.getItem('refreshToken');
    if (token && !user) {
      refreshAccessToken();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data } = await loginMutation({
        variables: { input: { email, password } },
      });

      if (data?.login) {
        localStorage.setItem('accessToken', data.login.accessToken);
        localStorage.setItem('refreshToken', data.login.refreshToken);
        setUser(data.login.user);
        toast.success('Welcome back!');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      return false;
    }
  };

  const signup = async (
    username: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<boolean> => {
    try {
      const { data } = await signupMutation({
        variables: { input: { username, email, password, displayName } },
      });

      if (data?.signup) {
        localStorage.setItem('accessToken', data.signup.accessToken);
        localStorage.setItem('refreshToken', data.signup.refreshToken);
        setUser(data.signup.user);
        toast.success('Account created successfully!');
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error(error.message || 'Signup failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const { data } = await refreshTokenMutation({
        variables: { token: refreshToken },
      });

      if (data?.refreshToken) {
        localStorage.setItem('accessToken', data.refreshToken);
        // Refetch user data
        await refetchMe();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};