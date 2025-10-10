'use client';

import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: { email: string } | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  token: string | null;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut, getToken: clerkGetToken } = useClerkAuth();

  const getToken = async () => {
    try {
      return await clerkGetToken();
    } catch (error) {
      console.error('Error getting Clerk token:', error);
      return null;
    }
  };

  const logout = async () => {
    await signOut();
  };

  const value: AuthContextType = {
    user: clerkUser ? { email: clerkUser.primaryEmailAddress?.emailAddress || '' } : null,
    loading: !isLoaded,
    logout,
    isAuthenticated: !!clerkUser,
    token: null, // Token will be fetched via getToken() when needed
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
