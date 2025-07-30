import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { DashboardData } from '@/types/api';

interface DashboardFilters {
  triageStatus?: string;
}

export function useDashboard(filters?: DashboardFilters) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getDashboard(filters);
      
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [filters?.triageStatus]);

  // Real-time updates - poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchDashboard();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [loading]);

  const refresh = () => {
    fetchDashboard();
  };

  return {
    data,
    loading,
    error,
    refresh,
  };
}
