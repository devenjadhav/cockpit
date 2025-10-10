'use client';

import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ThemeProvider } from '@/hooks/useTheme';
import { ToastContainer } from '@/components/ui/Toast';
import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api';

function ApiClientInitializer({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  
  useEffect(() => {
    apiClient.setTokenProvider(getToken);
  }, [getToken]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ApiClientInitializer>
            {children}
            <ToastContainer />
          </ApiClientInitializer>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
