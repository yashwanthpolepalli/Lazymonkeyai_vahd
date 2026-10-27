import type { Role } from '@/types';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export const navConfig: Record<Role, NavItem[]> = {
  super_admin: [
    { label: 'Dashboard', path: '/super-admin', icon: 'layout-dashboard' },
    { label: 'Head Office', path: '/super-admin/vahds', icon: 'building-2' },
    { label: 'Audit Logs', path: '/super-admin/audit-logs', icon: 'shield-check' },
    { label: 'Support Desk', path: '/super-admin/support', icon: 'message-square' },
    { label: 'Settings', path: '/super-admin/settings', icon: 'settings' },
  ],
  ho: [
    { label: 'Dashboard', path: '/ho', icon: 'layout-dashboard' },
    { label: 'HRMS & Students', path: '/ho/hrms', icon: 'users' },
    { label: 'Organisations', path: '/ho/organisations', icon: 'building-2' },
    { label: 'Settings', path: '/ho/settings', icon: 'settings' },
  ],
  owner: [
    { label: 'Dashboard', path: '/owner', icon: 'layout-dashboard' },
    { label: 'HRMS & Students', path: '/owner/hrms', icon: 'users' },
    { label: 'Settings', path: '/owner/settings', icon: 'settings' },
  ],
  employee: [
    { label: 'Dashboard', path: '/employee', icon: 'layout-dashboard' },
    { label: 'Students', path: '/employee/customers', icon: 'users' },
    { label: 'HRMS', path: '/employee/hrms', icon: 'users' },
    { label: 'AI Coach', path: '/employee/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/employee/profile', icon: 'user' },
  ],
  student: [
    { label: 'Home', path: '/app', icon: 'home' },
    { label: 'Attendance', path: '/app/attendance', icon: 'calendar-check' },
    { label: 'AI Coach', path: '/app/ai-coach', icon: 'sparkles' },
    { label: 'Profile', path: '/app/profile', icon: 'user' },
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
  ho: '/ho',
  owner: '/owner',
  employee: '/employee',
  student: '/app',
  customer: '/app',
};

export function getNavItems(role: Role): NavItem[] {
  return navConfig[role] || [];
}

export function notifyModuleVisibilityChanged() {
  window.dispatchEvent(new Event('vahd_modules_changed'));
}

