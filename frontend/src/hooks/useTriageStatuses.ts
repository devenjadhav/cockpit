import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

export function useTriageStatuses() {
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getTriageStatuses();
        
        if (response.success && response.data) {
          setStatuses(response.data);
        } else {
          setError(response.message || 'Failed to fetch triage statuses');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch triage statuses');
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, []);

  return {
    statuses,
    loading,
    error,
  };
}
