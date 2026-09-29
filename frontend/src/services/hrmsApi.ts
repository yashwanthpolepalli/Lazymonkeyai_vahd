import { apiClient } from './apiClient';

export interface EmployeeItem {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  initials: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  reporting_manager: string;
  joined_date: string;
  employment_type: string;
  status: string;
  salary: number;
  avatar: string;
  skills: string[];
  gym_branch: string;
  emergency_contact: string;
  created_at?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string;
  head_name: string;
  is_active: boolean;
  employee_count: number;
}

export interface DesignationItem {
  id: string;
  title: string;
  department: string;
  level: string;
  description: string;
  employee_count: number;
}

export interface TeamItem {
  id: string;
  name: string;
  department: string;
  lead_name: string;
  description: string;
}

export interface DocumentItem {
  id: string;
  employee_id: string;
  employee_name: string;
  title: string;
  doc_type: string;
  file_size: string;
  status: string;
  uploaded_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  initials: string;
  designation: string;
  department: string;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  work_hours: number;
  notes: string;
}

export interface LeaveTypeItem {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  paid_type: 'PAID' | 'UNPAID' | 'HALF_PAY';
  is_paid: boolean;
  gender_eligibility: string[];
  employment_types?: string[];
  applicable_departments?: string[];
  applicable_designations?: string[];
  min_service_days: number;
  annual_quota: number;
  max_consecutive_days?: number | null;
  carry_forward_allowed: boolean;
  max_carry_forward_days: number;
  encashment_allowed?: boolean;
  max_encashment_days?: number;
  attachment_required: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeLeaveBalanceItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  gender: string;
  department: string;
  designation: string;
  leave_type_id: string;
  leave_type_name: string;
  leave_type_code: string;
  paid_type: string;
  is_paid: boolean;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  buffer_days: number;
  remaining_days: number;
}

export interface EligibleLeaveType extends LeaveTypeItem {
  balance?: {
    allocated_days: number;
    used_days: number;
    pending_days: number;
    buffer_days: number;
    remaining_days: number;
  };
}

/**
 * Formats a clean, professional employee-facing label for leave option dropdowns.
 * Dynamically resolves: "{Leave Name} ({Code}) — {Paid/Unpaid} · {Balance} days remaining"
 * Strips any redundant/duplicated code names from the raw name string.
 */
export function formatLeaveOptionLabel(leave: {
  name: string;
  code: string;
  paid_type?: string;
  is_paid?: boolean;
  annual_quota?: number;
  balance?: { remaining_days?: number };
}): string {
  let cleanName = (leave.name || '').trim();
  const code = (leave.code || '').trim().toUpperCase();

  // Strip duplicate code in parentheses if present in name (e.g. "Casual Leave (CL)" -> "Casual Leave")
  if (code) {
    cleanName = cleanName.replace(new RegExp(`\\s*\\(${code}\\)`, 'gi'), '').trim();
  }
  cleanName = cleanName.replace(/\s*\((Comp-Off|LWP|CL|SL|EL|ML|PL|CCL|AL|BL)\)/gi, '').trim();

  // Paid / Unpaid / Half Pay classification
  const paidType = (leave.paid_type || (leave.is_paid ? 'PAID' : 'UNPAID')).toUpperCase();
  const payLabel =
    paidType === 'PAID' || leave.is_paid
      ? 'Paid'
      : paidType === 'HALF_PAY'
      ? 'Half Pay'
      : 'Unpaid';

  // Balance days formatting
  const remaining = leave.balance?.remaining_days ?? leave.annual_quota ?? 0;
  const isCompOff = code === 'COMP' || cleanName.toLowerCase().includes('comp');
  const isUnpaid = paidType === 'UNPAID';

  let balanceText = '';
  if (isCompOff) {
    balanceText = `${remaining} ${remaining === 1 ? 'day' : 'days'} available`;
  } else if (remaining === 0 && (leave.annual_quota === 0 || !leave.annual_quota)) {
    balanceText = isUnpaid ? '30 days remaining' : 'Unlimited';
  } else {
    balanceText = `${remaining} ${remaining === 1 ? 'day' : 'days'} remaining`;
  }

  return `${cleanName}${code ? ` (${code})` : ''} — ${payLabel} · ${balanceText}`;
}

export interface LeaveItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  gender?: string;
  department: string;
  leave_type: string;
  leave_type_id?: string;
  paid_type?: string;
  is_paid?: boolean;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  approved_by: string;
  applied_on: string;
  attachment_url?: string;
  rejection_reason?: string;
}

export interface PayrollItem {
  id: string;
  employee_id: string;
  trainer_id?: string;
  employee_code: string;
  employee_name: string;
  initials?: string;
  designation?: string;
  department?: string;
  month: string;
  year: number;
  month_year?: string;
  base_salary: number;
  base_salary_earned?: number;
  days_present?: number;
  days_absent?: number;
  paid_leave_days?: number;
  pt_sessions_count?: number;
  pt_session_rate?: number;
  commission_earned?: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  upi_id?: string;
  payment_method?: string;
  payment_date?: string;
  transaction_reference?: string;
}

export interface RecruitmentJobItem {
  id: string;
  title: string;
  department: string;
  openings: number;
  job_type: string;
  experience: string;
  salary_range: string;
  status: string;
  posted_date: string;
  applicant_count: number;
}

export interface ApplicantItem {
  id: string;
  job_id?: string;
  job_title: string;
  department: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  experience_years: number;
  rating: number;
  applied_date: string;
}

export interface RecruitmentOverview {
  jobs: RecruitmentJobItem[];
  applicants: ApplicantItem[];
  total_openings: number;
  total_applicants: number;
}

export interface PerformanceItem {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  initials: string;
  designation: string;
  department: string;
  review_period: string;
  score: number;
  kpi_ratings: Array<{
    kpi: string;
    target: string;
    achieved: string;
    score: number;
  }>;
  feedback: string;
  reviewer: string;
  status: string;
}

export interface ExitItem {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  initials: string;
  designation: string;
  department: string;
  resignation_date: string;
  last_working_day: string;
  reason: string;
  handover_status: string;
  settlement_status: string;
  status: string;
}

export interface GeofenceScheme {
  id: string;
  name: string;
  branch_name: string;
  gym_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  strict_restriction: boolean;
  ip_whitelist: string;
  shift_start_time: string;
  shift_end_time: string;
  grace_period_mins: number;
  min_half_day_hours?: number | null;
  allowed_channels: string[];
  assigned_employee_ids: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PunchResponse {
  message: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
  time: string;
  status: string;
  distance_meters?: number | null;
  is_within_geofence?: boolean;
  method?: string;
  employee_name?: string;
}

export const hrmsApi = {
  // Employees
  getEmployees: (params?: { department?: string; status?: string; search?: string }) =>
    apiClient.get<EmployeeItem[]>('/hrms/employees', { params }),
  createEmployee: (payload: Partial<EmployeeItem>) =>
    apiClient.post<{ message: string; id: string; code: string }>('/hrms/employees', payload),
  updateEmployee: (empId: string, payload: Partial<EmployeeItem>) =>
    apiClient.put<{ message: string }>(`/hrms/employees/${empId}`, payload),
  deleteEmployee: (empId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/employees/${empId}`),

  // Organization
  getDepartments: () => apiClient.get<DepartmentItem[]>('/hrms/departments'),
  getDesignations: () => apiClient.get<DesignationItem[]>('/hrms/designations'),
  getTeams: () => apiClient.get<TeamItem[]>('/hrms/teams'),
  getDocuments: (employee_id?: string) =>
    apiClient.get<DocumentItem[]>('/hrms/documents', { params: { employee_id } }),

  // Geofencing Schemes
  getGeofenceSchemes: () => apiClient.get<GeofenceScheme[]>('/hrms/geofence-schemes'),
  saveGeofenceScheme: (payload: Partial<GeofenceScheme>) =>
    apiClient.post<{ message: string; scheme_id: string }>('/hrms/geofence-schemes', payload),
  deleteGeofenceScheme: (schemeId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/geofence-schemes/${schemeId}`),

  // Attendance
  getAttendance: (date?: string) =>
    apiClient.get<AttendanceRecord[]>('/hrms/attendance', { params: { date } }),
  recordPunch: (payload: {
    employee_id: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    note?: string;
    latitude?: number | null;
    longitude?: number | null;
    method?: string;
    user_role?: string;
    branch?: string;
  }) => apiClient.post<PunchResponse>('/hrms/attendance/punch', payload),

  // Leave
  getLeaves: () => apiClient.get<LeaveItem[]>('/hrms/leaves'),
  applyLeave: (payload: {
    employee_id: string;
    leave_type?: string;
    leave_type_id?: string;
    start_date: string;
    end_date: string;
    reason: string;
    attachment_url?: string;
  }) =>
    apiClient.post<{ message: string; id: string; days: number; leave_type: string }>('/hrms/leaves', payload),
  updateLeaveStatus: (leaveId: string, payload: { status: string; reviewer?: string; rejection_reason?: string }) =>
    apiClient.put<{ message: string }>(`/hrms/leaves/${leaveId}/action`, payload),

  // Leave Policies & Customization (Samarth LMS standard)
  getLeaveTypes: (active_only?: boolean) =>
    apiClient.get<LeaveTypeItem[]>('/hrms/leave-types', { params: { active_only } }),
  createLeaveType: (payload: Partial<LeaveTypeItem>) =>
    apiClient.post<{ message: string; id: string; leave_type: LeaveTypeItem }>('/hrms/leave-types', payload),
  updateLeaveType: (leaveTypeId: string, payload: Partial<LeaveTypeItem>) =>
    apiClient.put<{ message: string; leave_type: LeaveTypeItem }>(`/hrms/leave-types/${leaveTypeId}`, payload),
  deleteLeaveType: (leaveTypeId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/leave-types/${leaveTypeId}`),
  getEligibleLeaveTypes: (employeeId: string) =>
    apiClient.get<{ employee: any; eligible_leave_types: EligibleLeaveType[]; count: number }>(
      `/hrms/leave-types/eligible/${employeeId}`
    ),
  getLeaveBalances: (year?: number) =>
    apiClient.get<EmployeeLeaveBalanceItem[]>('/hrms/leave-balances', { params: { year } }),
  adjustLeaveBalance: (payload: {
    employee_id: string;
    leave_type_id: string;
    year?: number;
    allocated_days?: number;
    used_days?: number;
    buffer_days?: number;
  }) => apiClient.post<{ message: string; balance: any }>('/hrms/leave-balances/adjust', payload),

  // Enterprise Payroll Suite API Client (All 11 Sub-tabs)
  getSalaryStructures: () => apiClient.get<any[]>('/hrms/payroll/structures'),
  saveSalaryStructure: (payload: any) => apiClient.post<any>('/hrms/payroll/structures', payload),
  deleteSalaryStructure: (id: string) => apiClient.delete<any>(`/hrms/payroll/structures/${id}`),

  getPayrollProcessing: (month: number, year: number, department?: string, status_filter?: string) =>
    apiClient.get<any>('/hrms/payroll/processing', { params: { month, year, department, status_filter } }),
  disburseBatchPayroll: (payload: { month: number; year: number; employee_ids?: string[]; payment_method?: string }) =>
    apiClient.post<any>('/hrms/payroll/disburse-batch', payload),
  disburseSingleEmployee: (payload: { employee_id: string; month: number; year: number; payment_method?: string; transaction_ref?: string }) =>
    apiClient.post<any>('/hrms/payroll/disburse-single', payload),

  getStatutoryPfReport: (month: number, year: number) =>
    apiClient.get<any>('/hrms/payroll/statutory/pf', { params: { month, year } }),
  getStatutoryEsiReport: (month: number, year: number) =>
    apiClient.get<any>('/hrms/payroll/statutory/esi', { params: { month, year } }),
  getStatutoryTdsReport: (year: number) =>
    apiClient.get<any>('/hrms/payroll/statutory/tds', { params: { year } }),

  getPayslipsArchive: (month?: string, year?: number, search?: string) =>
    apiClient.get<any>('/hrms/payroll/payslips', { params: { month, year, search } }),
  getPayslipTemplates: () => apiClient.get<any[]>('/hrms/payroll/templates'),
  savePayslipTemplate: (payload: any) => apiClient.post<any>('/hrms/payroll/templates', payload),
  updatePayslipTemplate: (id: string, payload: any) => apiClient.put<any>(`/hrms/payroll/templates/${id}`, payload),
  setDefaultPayslipTemplate: (id: string) => apiClient.post<any>(`/hrms/payroll/templates/${id}/set-default`),

  getLoans: () => apiClient.get<any[]>('/hrms/payroll/loans'),
  createLoan: (payload: any) => apiClient.post<any>('/hrms/payroll/loans', payload),
  getAdvances: () => apiClient.get<any[]>('/hrms/payroll/advances'),
  createAdvance: (payload: any) => apiClient.post<any>('/hrms/payroll/advances', payload),
  getBonuses: () => apiClient.get<any[]>('/hrms/payroll/bonuses'),
  createBonus: (payload: any) => apiClient.post<any>('/hrms/payroll/bonuses', payload),
  getCommissions: () => apiClient.get<any[]>('/hrms/payroll/commissions'),
  createCommission: (payload: any) => apiClient.post<any>('/hrms/payroll/commissions', payload),

  // Legacy Payroll
  getPayroll: (month?: string, year?: number) =>
    apiClient.get<PayrollItem[]>('/hrms/payroll', { params: { month, year } }),
  generateBatchPayroll: (payload: { trainer_ids: string[]; month?: string; year?: number }) =>
    apiClient.post<PayrollItem[]>('/hrms/payroll/generate-batch', payload),
  disbursePayroll: (payrollId: string, payload: { payment_method: string; transaction_reference?: string }) =>
    apiClient.post<{ message: string; id: string }>(`/hrms/payroll/${payrollId}/disburse`, payload),
  processPayout: (payrollId: string, payload: { status: string; payment_method?: string; transaction_reference?: string }) =>
    apiClient.put<{ message: string }>(`/hrms/payroll/${payrollId}/payout`, payload),

  // Recruitment
  getRecruitment: () => apiClient.get<RecruitmentOverview>('/hrms/recruitment'),
  updateApplicantStage: (applicantId: string, stage: string) =>
    apiClient.put<{ message: string }>(`/hrms/recruitment/applicants/${applicantId}/stage`, { stage }),

  // Performance
  getPerformance: () => apiClient.get<PerformanceItem[]>('/hrms/performance'),

  // Exit
  getExitRequests: () => apiClient.get<ExitItem[]>('/hrms/exit'),
  updateExitStatus: (exitId: string, payload: { status?: string; handover_status?: string; settlement_status?: string }) =>
    apiClient.put<{ message: string }>(`/hrms/exit/${exitId}`, payload),

  // Face ID & Biometrics
  getFaceStatus: (employeeId?: string) =>
    apiClient.get<{
      is_enrolled: boolean;
      face_image?: string | null;
      full_name?: string;
      enrolled_at?: string | null;
      role?: string;
    }>('/hrms/face/status', { params: { employee_id: employeeId } }),

  registerFace: (payload: { employee_id: string; face_image_base64: string }) =>
    apiClient.post<{
      status: string;
      message: string;
      is_enrolled: boolean;
      face_image?: string;
      full_name?: string;
    }>('/hrms/face/register', payload),

  verifyFace: (payload: {
    employee_id: string;
    live_image_base64: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    user_role?: string;
    branch?: string;
  }) =>
    apiClient.post<{
      status: string;
      match: boolean;
      confidence: number;
      confidence_percentage: string;
      message: string;
      action: string;
      time?: string;
      punch?: any;
    }>('/hrms/face/verify', payload),
};

