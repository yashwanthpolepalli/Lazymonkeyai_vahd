export interface studentMembership {
  plan_name: string;
  status: string;
  start_date: string | null;
  expiry_date: string | null;
  days_remaining: number;
}

export interface studentProfile {
  id: string;
  member_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  profile_image: string;
  status: string;
  membership: studentMembership;
}

export interface studentDashboardKpi {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface CourseProgressData {
  progress_percentage: number;
  total_days: number;
  days_elapsed: number;
  days_remaining: number;
  plan_name: string;
  status: string;
  start_date?: string | null;
  expiry_date?: string | null;
}

export interface studentDashboardData {
  greeting?: string;
  subtitle?: string;
  attendance?: {
    total_visits: number;
  };
  course_progress?: CourseProgressData;
  kpis?: studentDashboardKpi[];
}

export interface studentAttendanceHistory {
  id: string;
  date?: string;
  time?: string;
  timestamp?: string;
  check_in?: string;
  check_out?: string;
  duration?: string;
  type?: string;
  event_type?: string;
  verification_type?: string;
  direction?: string;
  status?: string;
  device_name?: string;
  confidence_score?: number;
  is_active?: boolean;
}

export interface studentAttendanceData {
  total_visits: number;
  current_streak: number;
  monthly_visits: number;
  monthly_target?: number;
  is_checked_in?: boolean;
  today_check_in?: string | null;
  today_check_out?: string | null;
  last_visit: string | null;
  history: studentAttendanceHistory[];
}

export interface studentBiometricStatus {
  face_recognition: { status: string; active?: boolean; enrolled?: boolean };
  fingerprint: { status: string; active?: boolean; enrolled?: boolean };
  rfid_card: { status: string; card_number: string; active?: boolean; assigned?: boolean };
  last_verification: string | null;
  notice: string;
}
