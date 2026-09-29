import { apiClient } from './apiClient';
import type { Member } from '@/types/member';

export const membersApi = {
  list: async (params?: Record<string, string>): Promise<Member[]> => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    /* eslint-disable @typescript-eslint/no-explicit-any */
    let rawList: any[] = [];
    try {
      const res = await apiClient.get<any[]>(`/customers${query}`);
      rawList = Array.isArray(res) ? res : [];
    } catch (_err) {
      try {
        const res = await apiClient.get<any[]>(`/members${query}`);
        rawList = Array.isArray(res) ? res : [];
      } catch (_err2) {
        rawList = [];
      }
    }

    return rawList.map((item: any) => {
      const statusRaw = String(item.status || '').toLowerCase();
      const status: Member['status'] = ['active', 'inactive', 'expiring', 'trial', 'vip'].includes(statusRaw)
        ? (statusRaw as Member['status'])
        : 'active';

      const riskRaw = String(item.risk || '').toLowerCase();
      const risk: Member['risk'] = ['low', 'medium', 'high'].includes(riskRaw)
        ? (riskRaw as Member['risk'])
        : 'low';

      return {
        id: item.id || '',
        name: item.name || item.full_name || '',
        email: item.email || '',
        phone: item.phone || '',
        avatar: item.avatar || item.profile_image || '',
        membership: item.membership || (typeof item.membership_plan === 'object' ? item.membership_plan?.planName : item.membership_plan) || '',
        status,
        attendance: Number(item.attendance) || 0,
        lastVisit: item.lastVisit || '',
        expiry: item.expiry || '',
        revenue: item.revenue || '',
        risk,
        branch: item.branch || '',
        joinDate: item.joinDate || item.created_at || '',
        age: Number(item.age) || 0,
        gender: item.gender || '',
        weight: Number(item.weight) || 0,
        bodyFat: Number(item.bodyFat) || 0,
        goal: item.goal || '',
        trainer: item.trainer || '',
        enable_workout_videos: item.enable_workout_videos !== undefined ? Boolean(item.enable_workout_videos) : true,
      };
    });
  },
  get: async (id: string): Promise<Member | null> => {
    try {
      const item: any = await apiClient.get<any>(`/customers/${id}`);
      if (!item) return null;
      return {
        id: item.id || id,
        name: item.name || item.full_name || '',
        email: item.email || '',
        phone: item.phone || '',
        avatar: item.avatar || item.profile_image || '',
        membership: item.membership || (typeof item.membership_plan === 'object' ? item.membership_plan?.planName : item.membership_plan) || '',
        status: (item.status ? String(item.status).toLowerCase() : 'active') as Member['status'],
        attendance: Number(item.attendance) || 0,
        lastVisit: item.lastVisit || '',
        expiry: item.expiry || '',
        revenue: item.revenue || '',
        risk: (item.risk ? String(item.risk).toLowerCase() : 'low') as Member['risk'],
        branch: item.branch || '',
        joinDate: item.joinDate || item.created_at || '',
        age: Number(item.age) || 0,
        gender: item.gender || '',
        weight: Number(item.weight) || 0,
        bodyFat: Number(item.bodyFat) || 0,
        goal: item.goal || '',
        trainer: item.trainer || '',
        enable_workout_videos: item.enable_workout_videos !== undefined ? Boolean(item.enable_workout_videos) : true,
      };
    } catch (_err) {
      return null;
    }
  },
  toggleWorkoutVideoAccess: async (id: string, enable: boolean): Promise<any> => {
    return apiClient.patch(`/customers/${id}/workout-video-access`, { enable_workout_videos: enable });
  },
  update: async (id: string, data: any): Promise<any> => {
    return apiClient.patch(`/customers/${id}`, data);
  },
  create: async (data: Partial<Member> & {
    role?: string;
    plan_price?: number;
    payment_method?: string;
    paid_amount?: number;
    due_amount?: number;
    invoice_number?: string;
    transaction_id?: string;
    start_date?: string;
    expiry_date?: string;
    branch?: string;
    primary_gym_location?: string;
  }): Promise<any> => {
    return apiClient.post('/customers/onboard', {
      full_name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role || 'CUSTOMER',
      gender: data.gender,
      age: data.age ? Number(data.age) : undefined,
      goal: data.goal,
      branch: data.branch || data.primary_gym_location,
      primary_gym_location: data.primary_gym_location || data.branch,
      membership_plan: data.membership,
      plan_price: data.plan_price,
      payment_method: data.payment_method || 'Cash',
      paid_amount: data.paid_amount,
      due_amount: data.due_amount,
      invoice_number: data.invoice_number,
      transaction_id: data.transaction_id,
      start_date: data.start_date,
      expiry_date: data.expiry_date,
      enable_workout_videos: data.enable_workout_videos !== undefined ? data.enable_workout_videos : true,
    });
  },
};
