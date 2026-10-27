export type Role = 'super_admin' | 'ho' | 'owner' | 'employee' | 'student' | 'customer';

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
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}
