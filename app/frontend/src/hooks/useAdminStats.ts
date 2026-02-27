/**
 * useAdminStats Hook
 * Fetches and manages admin platform statistics
 */

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/services/adminApi';
import type { AdminStats, AdminAnalytics } from '@/types/admin';

interface UseAdminStatsReturn {
  stats: AdminStats | null;
  analytics: AdminAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminStats(): UseAdminStatsReturn {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch both stats and analytics in parallel
      const [statsRes, analyticsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getAnalytics(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      } else if (statsRes.error) {
        setError(statsRes.error);
      }

      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError('Failed to load admin statistics');
      console.error('useAdminStats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    analytics,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useAdminStats;
