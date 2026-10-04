import type { Role } from '@/types';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const navConfig: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Overview', path: '/super-admin', icon: 'layout-dashboard' },
    { label: 'Organizations', path: '/super-admin/gyms', icon: 'building-2' },
    { label: 'SaaS Plans', path: '/super-admin/plans', icon: 'credit-card' },
    { label: 'Feature Controls', path: '/super-admin/features', icon: 'toggle-left' },
    { label: 'AI Platform', path: '/super-admin/ai-engine', icon: 'sparkles' },
    { label: 'Devices', path: '/super-admin/devices', icon: 'monitor' },
    { label: 'Audit Logs', path: '/super-admin/audit-logs', icon: 'shield-check' },
    { label: 'Support Desk', path: '/super-admin/support', icon: 'message-square' },
    { label: 'Settings', path: '/super-admin/settings', icon: 'settings' },
  ],
  owner: [
    { label: 'Executive Overview', path: '/owner', icon: 'layout-grid' },
    { label: 'HRMS & Students', path: '/owner/hrms', icon: 'users' },
    { label: 'POS', path: '/owner/pos', icon: 'credit-card' },
    { label: 'Payments', path: '/owner/payments', icon: 'indian-rupee' },
    { label: 'IoT Devices', path: '/owner/iot', icon: 'cpu' },
    { label: 'Multi-Branch', path: '/owner/multi-branch', icon: 'git-branch' },
    { label: 'Settings', path: '/owner/settings', icon: 'settings' },
  ],
  employee: [
    { label: 'Dashboard', path: '/trainer', icon: 'layout-dashboard' },
    { label: 'Students', path: '/trainer/customers', icon: 'users' },
    { label: 'HRMS', path: '/trainer/hrms', icon: 'users' },
    { label: 'AI Coach', path: '/trainer/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/trainer/profile', icon: 'user' },
  ],
  student: [
    { label: 'Home', path: '/app', icon: 'home' },
    { label: 'Attendance', path: '/app/attendance', icon: 'calendar-check' },
    { label: 'AI Coach', path: '/app/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/app/profile', icon: 'user' },
  ],
  trainer: [
    { label: 'Dashboard', path: '/trainer', icon: 'layout-dashboard' },
    { label: 'Students', path: '/trainer/customers', icon: 'users' },
    { label: 'HRMS', path: '/trainer/hrms', icon: 'users' },
    { label: 'AI Coach', path: '/trainer/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/trainer/profile', icon: 'user' },
  ],
  customer: [
    { label: 'Home', path: '/app', icon: 'home' },
    { label: 'Attendance', path: '/app/attendance', icon: 'calendar-check' },
    { label: 'AI Coach', path: '/app/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/app/profile', icon: 'user' },
  ],
};

export const roleHomePath: Record<Role, string> = {
  super_admin: '/super-admin',
  owner: '/owner',
  employee: '/trainer',
  student: '/app',
  trainer: '/trainer',
  customer: '/app',
};

export function getNavItems(role: Role): NavItem[] {
  return navConfig[role] || [];
}

export function notifyModuleVisibilityChanged() {
  window.dispatchEvent(new Event('vahd_modules_changed'));
}

