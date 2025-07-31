import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { DashboardData } from '@/types/api';

interface DashboardFilters {
  triageStatus?: string;
}

interface DashboardOptions {
  filters?: DashboardFilters;
  enablePolling?: boolean;
  pollingInterval?: number;
}

export function useDashboard(options?: DashboardOptions) {
  const { 
    filters, 
    enablePolling = true, 
    pollingInterval = 120000 // 2 minutes default
  } = options || {};
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
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
  }, [filters]);

  useEffect(() => {
    fetchDashboard();
  }, [filters?.triageStatus]);

  // Real-time updates - configurable polling
  useEffect(() => {
    if (!enablePolling) return;

    const interval = setInterval(() => {
      fetchDashboard();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enablePolling, pollingInterval, fetchDashboard]);

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
