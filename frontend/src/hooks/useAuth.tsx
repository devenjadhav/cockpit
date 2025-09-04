import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { AuthUser, LoginRequest, VerifyTokenRequest } from '@/types/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<{ success: boolean; message: string }>;
  verifyToken: (data: VerifyTokenRequest) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        setToken(storedToken);
        
        if (apiClient.isAuthenticated()) {
          // Try to get user data from dashboard to verify token
          const response = await apiClient.getDashboard();
          if (response.success && response.data) {
            setUser({ email: response.data.organizerEmail });
          } else {
            apiClient.logout();
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiClient.logout();
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiClient.requestLogin(data);
      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const verifyToken = async (data: VerifyTokenRequest) => {
    try {
      const response = await apiClient.verifyToken(data);
      if (response.success) {
        setUser({ email: data.email });
        const newToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        setToken(newToken);
      }
      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Token verification failed',
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    apiClient.logout();
  };

  const value = {
    user,
    loading,
    login,
    verifyToken,
    logout,
    isAuthenticated: !!user,
    token,
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
