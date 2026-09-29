import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/services/dashboardApi';
import type { DashboardData } from '@/types/dashboard';

export function useDashboard(branch?: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.getOverview(branch);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to Fit Club server.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isEmpty = Boolean(
    data &&
      data.summary.total_members === 0 &&
      data.summary.checkins_today === 0 &&
      data.summary.active_memberships === 0 &&
      data.summary.today_revenue === 0
  );

  return {
    data,
    loading,
    error,
    isEmpty,
    refetch: fetchDashboard,
  };
}
