import { useState, useEffect, useCallback } from 'react';
import { trainersApi } from '@/services/trainersApi';
import type { Trainer } from '@/types/trainer';

export function useTrainers() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await trainersApi.list();
      setTrainers(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trainers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  return {
    trainers,
    loading,
    error,
    isEmpty: !loading && !error && trainers.length === 0,
    refetch: fetchTrainers,
  };
}
