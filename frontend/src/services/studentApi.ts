import { apiClient } from './apiClient';
import type {
  studentProfile,
  studentDashboardData,
  studentAttendanceData,
  studentBiometricStatus,
} from '@/types/student';

export const studentApi = {
  getProfile: (): Promise<studentProfile> =>
    apiClient.get<studentProfile>('/student/me'),

  updateProfile: (data: Partial<studentProfile>): Promise<{ status: string; message: string }> =>
    apiClient.patch<{ status: string; message: string }>('/student/me', data),

  getDashboard: (): Promise<studentDashboardData> =>
    apiClient.get<studentDashboardData>('/student/dashboard'),

  getAttendance: (): Promise<studentAttendanceData> =>
    apiClient.get<studentAttendanceData>('/student/attendance'),

  clearAttendanceLogs: (): Promise<{ status: string; message: string }> =>
    apiClient.delete<{ status: string; message: string }>('/student/attendance/logs'),

  getBiometricStatus: (): Promise<studentBiometricStatus> =>
    apiClient.get<studentBiometricStatus>('/student/biometric-status'),

  // Face ID Biometric Methods
  getFaceStatus: (): Promise<{ student_id: string; is_enrolled: boolean; face_image?: string | null; full_name?: string; enrolled_at?: string | null }> =>
    apiClient.get('/student/face/status'),

  registerFace: (payload: { face_image_base64: string }): Promise<{ status: string; message: string; is_enrolled: boolean; face_image?: string }> =>
    apiClient.post('/student/face/register', payload),

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
    apiClient.post('/student/face/verify', payload),
};
