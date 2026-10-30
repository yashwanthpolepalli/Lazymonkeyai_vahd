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
    { label: 'Students', path: '/employee/students', icon: 'users' },
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
};

export const roleHomePath: Record<Role, string> = {
  super_admin: '/super-admin',
  ho: '/ho',
  owner: '/owner',
  employee: '/employee',
  student: '/app',
};

export function getNavItems(role: Role, permissions?: Record<string, any>): NavItem[] {
  const baseItems = navConfig[role] || [];
  if (role !== 'owner' || !permissions || Object.keys(permissions).length === 0) {
    return baseItems;
  }

  const items: NavItem[] = [];

  // Dashboard - strictly only if ticked
  const hasDashboard = !!(
    permissions['dashboard.view'] ||
    permissions['dashboard'] ||
    permissions['dashboard_analytics.view'] ||
    permissions['dashboard_attendance_stream.view']
  );
  if (hasDashboard) {
    items.push({ label: 'Dashboard', path: '/owner', icon: 'layout-dashboard' });
  }

  // HRMS & Students - strictly only if ticked
  const hasHrms = !!(
    permissions['hrms_section.view'] ||
    permissions['hrms.view'] ||
    permissions['hrms_overview.view'] ||
    permissions['employee_details.view'] ||
    permissions['employees.view'] ||
    permissions['hrms_departments.view'] ||
    permissions['hrms_designations.view'] ||
    permissions['hrms_teams.view'] ||
    permissions['hrms_documents.view'] ||
    permissions['attendance.view'] ||
    permissions['geofence_portal.view'] ||
    permissions['biometrics.view'] ||
    permissions['face_recognition.view'] ||
    permissions['gps_attendance.view'] ||
    permissions['shift_attendance.view'] ||
    permissions['attendance_corrections.view'] ||
    permissions['attendance_approve.view'] ||
    permissions['absent_employees.view'] ||
    permissions['attendance_report.view'] ||
    permissions['leave_management.view'] ||
    permissions['leaves.view'] ||
    permissions['payroll.view'] ||
    permissions['exit_management.view'] ||
    permissions['students_section.view'] ||
    permissions['students.view'] ||
    permissions['student_details.view'] ||
    permissions['student_enrollment.view'] ||
    permissions['student_attendance.view']
  );
  if (hasHrms) {
    items.push({ label: 'HRMS & Students', path: '/owner/hrms', icon: 'users' });
  }

  // Reports - strictly only if ticked
  const hasReports = !!(
    permissions['reports_section.view'] ||
    permissions['reports.view'] ||
    permissions['reports_attendance.view'] ||
    permissions['reports_financial.view'] ||
    permissions['audit_logs.view']
  );
  if (hasReports) {
    items.push({ label: 'Reports', path: '/owner/reports', icon: 'bar-chart-3' });
  }

  // Settings - strictly only if ticked
  const hasSettings = !!(
    permissions['settings_section.view'] ||
    permissions['settings.view'] ||
    permissions['branch_profile.view'] ||
    permissions['general.view'] ||
    permissions['settings.profile'] ||
    permissions['courses.view'] ||
    permissions['courses'] ||
    permissions['master_data.view'] ||
    permissions['districts.view'] ||
    permissions['mandals.view'] ||
    permissions['towns.view'] ||
    permissions['departments.view'] ||
    permissions['designations.view'] ||
    permissions['roles.view'] ||
    permissions['institution_types.view'] ||
    permissions['qualifications.view'] ||
    permissions['specializations.view'] ||
    permissions['leave_reasons.view'] ||
    permissions['erp.view'] ||
    permissions['permissions.view']
  );
  if (hasSettings) {
    items.push({ label: 'Settings', path: '/owner/settings', icon: 'settings' });
  }

  return items;
}

export function notifyModuleVisibilityChanged() {
  window.dispatchEvent(new Event('vahd_modules_changed'));
}

