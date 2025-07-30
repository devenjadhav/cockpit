'use client';

import { Dashboard } from '@/components/Dashboard';
import { AuthProvider } from '@/hooks/useAuth';

export default function DashboardPage() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
