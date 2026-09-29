export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  membership: string;
  status: 'active' | 'inactive' | 'expiring' | 'trial' | 'vip';
  attendance: number;
  lastVisit: string;
  expiry: string;
  revenue: string;
  risk: 'low' | 'medium' | 'high';
  branch: string;
  joinDate: string;
  age: number;
  gender: string;
  weight: number;
  bodyFat: number;
  goal: string;
  trainer: string;
  enable_workout_videos?: boolean;
}
