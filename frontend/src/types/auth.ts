export type Role = 'super_admin' | 'ho' | 'owner' | 'employee' | 'student' | 'student';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  phone?: string;
  role: Role;
  avatar: string;
  ho_id?: string;
  hoId?: string;
  ho_name?: string;
  vahdId?: string;
  vahdName?: string;
  vahd_name?: string;
  branchName?: string;
  branch_name?: string;
  branchId?: string;
  branch_id?: string;
  permissions?: Record<string, any>;
  role_title?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
