export interface CustomerMembership {
  plan_name: string;
  status: string;
  start_date: string | null;
  expiry_date: string | null;
  days_remaining: number;
}

export interface CustomerProfile {
  id: string;
  member_code: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age: number;
  weight: number;
  height: number;
  bmi: number;
  fitness_level: string;
  goal: string;
  target_weight?: number;
  profile_image: string;
  status: string;
  membership: CustomerMembership;
}

export interface CustomerDashboardKpi {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface CustomerDashboardData {
  greeting?: string;
  subtitle?: string;
  attendance?: {
    total_visits: number;
  };
  kpis?: CustomerDashboardKpi[];
}

export interface CustomerAttendanceHistory {
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

export interface CustomerAttendanceData {
  total_visits: number;
  current_streak: number;
  monthly_visits: number;
  monthly_target?: number;
  is_checked_in?: boolean;
  today_check_in?: string | null;
  today_check_out?: string | null;
  last_visit: string | null;
  history: CustomerAttendanceHistory[];
}

export interface CustomerBiometricStatus {
  face_recognition: { status: string; active?: boolean; enrolled?: boolean };
  fingerprint: { status: string; active?: boolean; enrolled?: boolean };
  rfid_card: { status: string; card_number: string; active?: boolean; assigned?: boolean };
  last_verification: string | null;
  notice: string;
}

export interface AICoachRecommendation {
  score: number;
  title: string;
  insight: string;
  suggested_action: string;
}
