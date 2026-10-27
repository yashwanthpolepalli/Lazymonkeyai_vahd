import { apiClient } from './apiClient';
import type { employee } from '@/types/employee';

export const employeesApi = {
  list: async (): Promise<employee[]> => {
    try {
      const res = await apiClient.get<employee[]>('/employees');
      return Array.isArray(res) ? res : [];
    } catch (_err) {
      return [];
    }
  },
  getAll: async (): Promise<employee[]> => {
    try {
      const res = await apiClient.get<employee[]>('/employees');
      return Array.isArray(res) ? res : [];
    } catch (_err) {
      return [];
    }
  },
  get: async (id: string): Promise<employee | null> => {
    try {
      return await apiClient.get<employee>(`/employees/${id}`);
    } catch (_err) {
      return null;
    }
  },
  /* eslint-disable @typescript-eslint/no-explicit-any */
  create: async (data: any): Promise<any> => {
    return apiClient.post('/employees', {
      full_name: data.name || data.full_name,
      email: data.email,
      phone: data.phone,
      role: (data.role && data.role !== 'employee') ? data.role : 'EMPLOYEE',
      specialization: data.specialty || data.goal || data.specialization || undefined,
      base_monthly_salary: data.base_monthly_salary !== undefined ? Number(data.base_monthly_salary) : (data.salary ? Number(data.salary) : 0),
      pt_session_rate: data.pt_session_rate !== undefined ? Number(data.pt_session_rate) : 0,
      branch: data.branch || data.primary_vahd_location || undefined,
      primary_vahd_location: data.primary_vahd_location || data.branch || undefined,
      bank_account_no: data.bank_account_no || undefined,
      bank_ifsc: data.bank_ifsc || undefined,
      upi_id: data.upi_id || undefined,
      join_date: data.join_date || data.created_at || undefined,
    });
  },
  delete: async (id: string): Promise<any> => {
    return apiClient.delete(`/employees/${id}`);
  },
};
