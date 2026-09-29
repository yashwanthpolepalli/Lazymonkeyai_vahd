import { apiClient } from './apiClient';
import type { Trainer } from '@/types/trainer';

export const trainersApi = {
  list: async (): Promise<Trainer[]> => {
    try {
      const res = await apiClient.get<Trainer[]>('/trainers');
      return Array.isArray(res) ? res : [];
    } catch (_err) {
      return [];
    }
  },
  get: async (id: string): Promise<Trainer | null> => {
    try {
      return await apiClient.get<Trainer>(`/trainers/${id}`);
    } catch (_err) {
      return null;
    }
  },
  /* eslint-disable @typescript-eslint/no-explicit-any */
  create: async (data: any): Promise<any> => {
    return apiClient.post('/trainers', {
      full_name: data.name || data.full_name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'TRAINER',
      specialization: data.specialty || data.goal || data.specialization || undefined,
      base_monthly_salary: data.base_monthly_salary !== undefined ? Number(data.base_monthly_salary) : (data.salary ? Number(data.salary) : 0),
      pt_session_rate: data.pt_session_rate !== undefined ? Number(data.pt_session_rate) : 0,
      branch: data.branch || data.primary_gym_location || undefined,
      primary_gym_location: data.primary_gym_location || data.branch || undefined,
      bank_account_no: data.bank_account_no || undefined,
      bank_ifsc: data.bank_ifsc || undefined,
      upi_id: data.upi_id || undefined,
      join_date: data.join_date || data.created_at || undefined,
    });
  },
  delete: async (id: string): Promise<any> => {
    return apiClient.delete(`/trainers/${id}`);
  },
};
