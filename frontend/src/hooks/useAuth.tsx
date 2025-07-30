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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const checkAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          // Try to get user data from dashboard to verify token
          const response = await apiClient.getDashboard();
          if (response.success && response.data) {
            setUser({ email: response.data.organizerEmail });
          } else {
            apiClient.logout();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        apiClient.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      console.log('Making login request with data:', data);
      const response = await apiClient.requestLogin(data);
      console.log('Login response:', response);
      return {
        success: response.success,
        message: response.message,
      };
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
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
    apiClient.logout();
  };

  const value = {
    user,
    loading,
    login,
    verifyToken,
    logout,
    isAuthenticated: !!user,
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
