import { useState, useEffect, useCallback } from 'react';
import { employeesApi } from '@/services/employeesApi';
import type { employee } from '@/types/employee';

export function useemployees() {
  const [employees, setemployees] = useState<employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchemployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await employeesApi.list();
      setemployees(result || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchemployees();
  }, [fetchemployees]);

  return {
    employees,
    loading,
    error,
    isEmpty: !loading && !error && employees.length === 0,
    refetch: fetchemployees,
  };
}
