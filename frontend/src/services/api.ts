import { apiClient } from './apiClient';
import { dashboardApi } from './dashboardApi';
import { membersApi } from './membersApi';
import { trainersApi } from './trainersApi';
import { biometricService } from './biometric';
import type { User } from '@/types/auth';

export { apiClient } from './apiClient';
export { dashboardApi } from './dashboardApi';
export { membersApi } from './membersApi';
export { trainersApi } from './trainersApi';
export { biometricService } from './biometric';

export { customerApi } from './customerApi';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const api = {
  auth: {
    login: async (email: string, password?: string, role?: string): Promise<User> => {
      try {
        const res = await apiClient.post<any>('/auth/login', {
          email,
          password: password,
          role: role ? role.toUpperCase() : undefined,
        });

        if (res && res.access_token) {
          localStorage.setItem('fitclub_token', res.access_token);
        }

        const userRole = (res.role || '').toLowerCase();
        const mappedRole = (userRole.includes('admin') ? 'super_admin' : userRole.includes('owner') ? 'owner' : userRole.includes('trainer') ? 'trainer' : 'customer') as User['role'];

        return {
          id: res.user_id || res.customer_id || '',
          name: res.full_name || email.split('@')[0] || '',
          email: res.email || email,
          phone: res.phone || '',
          role: mappedRole,
          avatar: res.avatar_url || '',
          gymId: res.gym_id || '',
          gymName: res.gym_name || '',
          branchName: res.branch_name || '',
        };
      } catch (err) {
        throw err;
      }
    },
    signup: async (data: { full_name: string; email: string; password: string; phone?: string; gym_name?: string }): Promise<User> => {
      try {
        const res = await apiClient.post<any>('/auth/signup', {
          ...data,
          role: 'GYM_OWNER'
        });

        if (res && res.access_token) {
          localStorage.setItem('fitclub_token', res.access_token);
        }

        const userRole = (res.role || 'GYM_OWNER').toLowerCase();
        const role = (userRole.includes('admin') ? 'super_admin' : userRole.includes('owner') ? 'owner' : userRole.includes('trainer') ? 'trainer' : 'customer') as User['role'];

        return {
          id: res.user_id || '',
          name: res.full_name || data.full_name || '',
          email: res.email || data.email || '',
          phone: res.phone || data.phone || '',
          role: role,
          avatar: res.avatar_url || '',
          gymId: res.gym_id || '',
          gymName: res.gym_name || data.gym_name || '',
          branchName: res.branch_name || '',
        };
      } catch (err) {
        throw err;
      }
    },
    me: async (): Promise<User | null> => {
      try {
        const res = await apiClient.get<any>('/auth/me');
        if (!res) return null;
        const userRole = (res.role || '').toLowerCase();
        const role = (userRole.includes('admin') ? 'super_admin' : userRole.includes('owner') ? 'owner' : userRole.includes('trainer') ? 'trainer' : 'customer') as User['role'];

        return {
          id: res.user_id || res.customer_id || '',
          name: res.full_name || res.email?.split('@')[0] || '',
          email: res.email || '',
          phone: res.phone || '',
          role,
          avatar: res.avatar_url || '',
          gymId: res.gym_id || '',
          gymName: res.gym_name || '',
          branchName: res.branch_name || '',
        };
      } catch (_err) {
        return null;
      }
    },
  },
  dashboard: {
    ...dashboardApi,
    ownerKpis: (): Promise<any[]> => apiClient.get('/dashboard/owner-kpis'),
    superAdminKpis: (): Promise<any[]> => apiClient.get('/dashboard/super-admin-kpis'),
    trainerKpis: (): Promise<any[]> => apiClient.get('/dashboard/trainer-kpis'),
    customerKpis: (): Promise<any[]> => apiClient.get('/dashboard/customer-kpis'),
    activity: (): Promise<any[]> => apiClient.get('/dashboard/activity'),
    attention: (): Promise<any[]> => apiClient.get('/dashboard/attention'),
    customerRadar: (): Promise<any> => apiClient.get('/dashboard/radar'),
    revenue: (): Promise<any> => apiClient.get('/dashboard/revenue'),
  },
  customers: membersApi,
  members: membersApi,
  trainers: trainersApi,
  biometrics: {
    ...biometricService,
    analytics: (role?: string, physical_only = false): Promise<any> => {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (physical_only) params.set('physical_only', 'true');
      const q = params.toString();
      return apiClient.get(`/biometrics/analytics${q ? `?${q}` : ''}`);
    },
    recent: (limit = 50, role?: string, physical_only = false): Promise<any[]> => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (role) params.set('role', role);
      if (physical_only) params.set('physical_only', 'true');
      return apiClient.get(`/biometrics/recent?${params.toString()}`);
    },
    devices: (location = ''): Promise<any> => apiClient.get(`/biometrics/devices${location ? `?location=${encodeURIComponent(location)}` : ''}`),
    registerDevice: (payload: any): Promise<any> => apiClient.post('/biometrics/devices', payload),
    checkIn: (payload: any): Promise<any> => apiClient.post('/biometrics/check-in', payload),
  },
  workouts: {
    aiRecommendation: (): Promise<any> => apiClient.get('/workouts/recommendations'),
    exercises: (): Promise<any[]> => apiClient.get('/workouts/exercises'),
    todaySessions: (): Promise<any[]> => apiClient.get('/workouts/sessions/today'),
  },
  payments: {
    all: (params?: any): Promise<any> => apiClient.get('/payments/audit', { params }),
    audit: (params?: any): Promise<any> => apiClient.get('/payments/audit', { params }),
    transactions: (params?: any): Promise<any> => apiClient.get('/payments/transactions', { params }),
    membershipTransactions: (params?: any): Promise<any> => apiClient.get('/memberships/transactions', { params }),
  },
  aiCoach: {
    recommendations: (): Promise<any[]> => apiClient.get('/customer/ai/recommendation'),
    chat: (message: string): Promise<any> => apiClient.post('/ai-coach/chat', { message }),
  },
  nutrition: {
    summary: (): Promise<any> => apiClient.get('/nutrition/summary'),
  },
  foodScanner: {
    analyze: (): Promise<any> => apiClient.post('/food-scanner/analyze'),
  },
  bodyComposition: {
    get: (): Promise<any> => apiClient.get('/body-composition'),
  },
  health: {
    connections: (): Promise<any[]> => apiClient.get('/health/connections'),
    toggleConnection: (platform: string, connected?: boolean): Promise<any> =>
      apiClient.post('/health/toggle-connection', { platform, connected }),
    summary: (): Promise<any> => apiClient.get('/health/summary'),
    readiness: (): Promise<any> => apiClient.get('/health/readiness'),
    simulateSync: (payload?: any): Promise<any> => apiClient.post('/health/simulate-sync', payload || {}),
  },
  crm: {
    leads: (): Promise<any[]> => apiClient.get('/crm/leads'),
    updateLead: (id: string, status: string): Promise<any> => apiClient.patch(`/crm/leads/${id}`, { status }),
  },
  pos: {
    products: (): Promise<any[]> => apiClient.get('/pos/products'),
  },
  settings: {
    get: (): Promise<any> => apiClient.get('/gym/settings'),
    update: (payload: any): Promise<any> => apiClient.post('/gym/settings', payload),
    billing: (): Promise<any> => apiClient.get('/gym/billing'),
    saveBilling: (payload: any): Promise<any> => apiClient.post('/gym/billing', payload),
  },
  inventory: {
    products: (): Promise<any[]> => apiClient.get('/inventory/products'),
  },
  superAdmin: {
    gyms: (): Promise<any[]> => apiClient.get('/superadmin/gyms'),
    onboardGym: (payload: any): Promise<any> => apiClient.post('/superadmin/gyms', payload),
    updateGymStatus: (gymId: string, status: string): Promise<any> => apiClient.patch(`/superadmin/gyms/${gymId}/status`, { status }),
    resetOwnerCredentials: (userId: string, newPassword?: string): Promise<any> => apiClient.post(`/superadmin/owners/${userId}/reset-credentials`, { password: newPassword }),
    updateOwnerStatus: (userId: string, isActive: boolean): Promise<any> => apiClient.patch(`/superadmin/owners/${userId}/status`, { is_active: isActive }),
    users: (): Promise<any[]> => apiClient.get('/superadmin/users'),
    plans: (): Promise<any[]> => apiClient.get('/superadmin/plans'),
    createPlan: (payload: any): Promise<any> => apiClient.post('/superadmin/plans', payload),
    updatePlan: (id: string, payload: any): Promise<any> => apiClient.put(`/superadmin/plans/${id}`, payload),
    deletePlan: (id: string): Promise<any> => apiClient.delete(`/superadmin/plans/${id}`),
    billingOverview: (): Promise<any> => apiClient.get('/superadmin/billing/overview'),
    billingSettings: (): Promise<any> => apiClient.get('/superadmin/billing/settings'),
    saveBillingSettings: (payload: any): Promise<any> => apiClient.post('/superadmin/billing/settings', payload),
    devices: (): Promise<any[]> => apiClient.get('/superadmin/devices'),
    pingDevice: (id: string): Promise<any> => apiClient.post(`/superadmin/devices/ping/${id}`),
    registerDevice: (payload: any): Promise<any> => apiClient.post('/superadmin/devices', payload),
    deleteDevice: (id: string): Promise<any> => apiClient.delete(`/superadmin/devices/${id}`),
    aiModules: (): Promise<any> => apiClient.get('/superadmin/ai-modules'),
    updateAiModelRouting: (payload: any): Promise<any> => apiClient.post('/superadmin/ai/model-routing', payload),
    runTestAiJob: (payload?: any): Promise<any> => apiClient.post('/superadmin/ai/test-job', payload || {}),
    auditLogs: (): Promise<any[]> => apiClient.get('/superadmin/audit-logs'),
    supportTickets: (status?: string): Promise<any[]> => apiClient.get(`/superadmin/support-tickets${status ? `?status=${status}` : ''}`),
    createSupportTicket: (payload: any): Promise<any> => apiClient.post('/superadmin/support-tickets', payload),
    updateSupportTicketStatus: (id: string, status: string): Promise<any> => apiClient.patch(`/superadmin/support-tickets/${id}/status`, { status }),
    settings: (): Promise<any> => apiClient.get('/superadmin/settings'),
    featureControls: (): Promise<Record<string, Record<string, boolean>>> => apiClient.get('/superadmin/feature-controls'),
    saveFeatureControls: (matrix: any): Promise<any> => apiClient.post('/superadmin/feature-controls', matrix),
    nutritionPolicies: (): Promise<any[]> => apiClient.get('/superadmin/nutrition-policies'),
    saveNutritionPolicy: (payload: any): Promise<any> => apiClient.post('/superadmin/nutrition-policies', payload),
  },
};

