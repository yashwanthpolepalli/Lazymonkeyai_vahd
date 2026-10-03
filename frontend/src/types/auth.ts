export type Role = 'super_admin' | 'owner' | 'employee' | 'student' | 'trainer' | 'customer';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  role: Role;
  avatar: string;
  gymId?: string;
  gymName?: string;
  gym_name?: string;
  branchName?: string;
  branch_name?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
