import { apiClient } from './apiClient';
import type {
  CustomerProfile,
  CustomerDashboardData,
  CustomerAttendanceData,
  CustomerBiometricStatus,
  AICoachRecommendation,
} from '@/types/customer';

export const customerApi = {
  getProfile: (): Promise<CustomerProfile> =>
    apiClient.get<CustomerProfile>('/customer/me'),

  updateProfile: (data: Partial<CustomerProfile>): Promise<{ status: string; message: string }> =>
    apiClient.patch<{ status: string; message: string }>('/customer/me', data),

  getDashboard: (): Promise<CustomerDashboardData> =>
    apiClient.get<CustomerDashboardData>('/customer/dashboard'),

  getAttendance: (): Promise<CustomerAttendanceData> =>
    apiClient.get<CustomerAttendanceData>('/customer/attendance'),

  clearAttendanceLogs: (): Promise<{ status: string; message: string }> =>
    apiClient.delete<{ status: string; message: string }>('/customer/attendance/logs'),

  getBiometricStatus: (): Promise<CustomerBiometricStatus> =>
    apiClient.get<CustomerBiometricStatus>('/customer/biometric-status'),

  getAICoachRecommendation: (): Promise<AICoachRecommendation> =>
    apiClient.get<AICoachRecommendation>('/customer/ai/recommendation'),

  // Face ID Biometric Methods
  getFaceStatus: (): Promise<{ customer_id: string; is_enrolled: boolean; face_image?: string | null; full_name?: string; enrolled_at?: string | null }> =>
    apiClient.get('/customer/face/status'),

  registerFace: (payload: { face_image_base64: string }): Promise<{ status: string; message: string; is_enrolled: boolean; face_image?: string }> =>
    apiClient.post('/customer/face/register', payload),

  verifyFace: (payload: {
    live_image_base64: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    verification_type?: string;
    method?: string;
    device_name?: string;
    device_type?: string;
    user_role?: string;
    confidence_score?: number;
    [key: string]: any;
  }): Promise<{ status: string; match: boolean; confidence: number; confidence_percentage: string; message: string; action: string; time: string; punch?: any }> =>
    apiClient.post('/customer/face/verify', payload),
};
