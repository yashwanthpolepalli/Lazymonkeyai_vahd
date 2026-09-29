import { useState, useEffect, useCallback } from 'react';
import { membersApi } from '@/services/membersApi';
import type { Member } from '@/types/member';

export function useMembers(params?: Record<string, string>) {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await membersApi.list(params);
      setData(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members: data,
    loading,
    error,
    isEmpty: !loading && !error && data.length === 0,
    refetch: fetchMembers,
  };
}
