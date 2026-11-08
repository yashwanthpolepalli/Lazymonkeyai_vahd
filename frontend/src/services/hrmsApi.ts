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
  vahd_branch: string;
  emergency_contact: string;
  address?: string;
  district?: string;
  created_at?: string;
}

export interface MappedEmployee {
  id: string;
  name: string;
  email: string;
  code?: string;
  designation?: string;
  department?: string;
  phone?: string;
  status?: string;
  avatar?: string;
  joined_date?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  description: string;
  head_name: string;
  is_active: boolean;
  employee_count: number;
  student_count?: number;
  department_type?: 'student' | 'employee' | 'both';
  extra_info?: string;
  employees?: MappedEmployee[];
  students?: any[];
}

export interface DesignationItem {
  id: string;
  title: string;
  department: string;
  level: string;
  description: string;
  employee_count: number;
  employees?: MappedEmployee[];
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
  check_in_location?: string;
  check_out_location?: string;
  check_in_latitude?: number | null;
  check_in_longitude?: number | null;
  check_out_latitude?: number | null;
  check_out_longitude?: number | null;
  status: string;
  work_hours: number;
  notes: string;
}

export interface AttendanceCorrectionItem {
  id: string;
  person_type: 'EMPLOYEE' | 'STUDENT';
  person_id?: string;
  person_name: string;
  person_code: string;
  designation: string;
  department: string;
  district: string;
  place: string;
  date: string;
  date_formatted: string;
  in_time: string;
  out_time: string;
  reason: string;
  reason_details?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  avatar?: string;
  approved_by?: string;
  approved_at?: string | null;
  rejection_reason?: string;
  created_at?: string;
}

export interface AttendanceCorrectionStats {
  total_records: number;
  pending: number;
  approved: number;
  rejected: number;
  present: number;
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
  remaining_days?: number;
  used_days?: number;
  pending_days?: number;
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

  // Balance days formatting (dynamically accounts for remaining_days from API)
  const remaining = (leave as any).remaining_days ?? leave.balance?.remaining_days ?? leave.annual_quota ?? 0;
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
  vahd_name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  strict_restriction: boolean;
  ip_whitelist: string;
  shift_start_time: string;
  shift_end_time: string;
  grace_period_mins: number;
  min_half_day_hours?: number | null;
  allow_ot?: boolean;
  min_ot_threshold_mins?: number;
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
  getEmployees: (params?: { department?: string; status?: string; search?: string; branch_id?: string; ho_id?: string }) =>
    apiClient.get<EmployeeItem[]>('/hrms/employees', { params }),
  createEmployee: (payload: Partial<EmployeeItem>) =>
    apiClient.post<{ message: string; id: string; code: string }>('/hrms/employees', payload),
  updateEmployee: (empId: string, payload: Partial<EmployeeItem>) =>
    apiClient.put<{ message: string }>(`/hrms/employees/${empId}`, payload),
  deleteEmployee: (empId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/employees/${empId}`),

  // Organization - Departments & Designations CRUD
  getDepartments: () => apiClient.get<DepartmentItem[]>('/hrms/departments'),
  createDepartment: (payload: Partial<DepartmentItem>) =>
    apiClient.post<{ message: string; id: string }>('/hrms/departments', payload),
  updateDepartment: (deptId: string, payload: Partial<DepartmentItem>) =>
    apiClient.put<{ message: string }>(`/hrms/departments/${deptId}`, payload),
  deleteDepartment: (deptId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/departments/${deptId}`),

  getDesignations: () => apiClient.get<DesignationItem[]>('/hrms/designations'),
  createDesignation: (payload: Partial<DesignationItem>) =>
    apiClient.post<{ message: string; id: string }>('/hrms/designations', payload),
  updateDesignation: (desgId: string, payload: Partial<DesignationItem>) =>
    apiClient.put<{ message: string }>(`/hrms/designations/${desgId}`, payload),
  deleteDesignation: (desgId: string) =>
    apiClient.delete<{ message: string }>(`/hrms/designations/${desgId}`),

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
  getAttendance: (date?: string, branch_id?: string) =>
    apiClient.get<AttendanceRecord[]>('/hrms/attendance', { params: { date, branch_id } }),
  getAttendanceCorrections: (params?: {
    date?: string;
    status?: string;
    person_type?: string;
    department?: string;
    district?: string;
    reason?: string;
    search?: string;
    branch_id?: string;
    ho_id?: string;
  }) => apiClient.get<AttendanceCorrectionItem[]>('/hrms/attendance/corrections', { params }),
  getAttendanceCorrectionsStats: (params?: { date?: string; branch_id?: string; ho_id?: string }) =>
    apiClient.get<AttendanceCorrectionStats>('/hrms/attendance/corrections/stats', { params }),
  createAttendanceCorrection: (payload: Partial<AttendanceCorrectionItem>) =>
    apiClient.post<{ message: string; id: string }>('/hrms/attendance/corrections', payload),
  approveAttendanceCorrection: (correctionId: string, payload?: { approved_by?: string }) =>
    apiClient.put<{ message: string; id: string; status: string }>(`/hrms/attendance/corrections/${correctionId}/approve`, payload),
  rejectAttendanceCorrection: (correctionId: string, payload?: { rejection_reason?: string }) =>
    apiClient.put<{ message: string; id: string; status: string }>(`/hrms/attendance/corrections/${correctionId}/reject`, payload),
  batchApproveAttendanceCorrections: (payload: { ids: string[]; approved_by?: string }) =>
    apiClient.post<{ message: string; count: number }>('/hrms/attendance/corrections/batch-approve', payload),
  recordPunch: (payload: {
    employee_id: string;
    action: 'CHECK_IN' | 'CHECK_OUT';
    note?: string;
    latitude?: number | null;
    longitude?: number | null;
    location?: string;
    method?: string;
    user_role?: string;
    branch?: string;
  }) => apiClient.post<PunchResponse>('/hrms/attendance/punch', payload),

  // Leave
  getLeaves: (status?: string, branch_id?: string) => apiClient.get<LeaveItem[]>('/hrms/leaves', { params: { status, branch_id } }),
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
  getPayroll: (month?: string, year?: number, branch_id?: string) =>
    apiClient.get<PayrollItem[]>('/hrms/payroll', { params: { month, year, branch_id } }),
  generateBatchPayroll: (payload: { employee_ids: string[]; month?: string; year?: number }) =>
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
    verification_type?: string;
    method?: string;
    device_name?: string;
    device_type?: string;
    [key: string]: any;
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

  // Shift Roster & Work Calendars
  getWorkCalendars: () => apiClient.get<WorkCalendarItem[]>('/hrms/shifts/calendars'),
  saveWorkCalendar: (payload: any) => apiClient.post<WorkCalendarItem>('/hrms/shifts/calendars', payload),
  deleteWorkCalendar: (calId: string) => apiClient.delete<{ status: string; message: string }>(`/hrms/shifts/calendars/${calId}`),
  addCalendarShiftTiming: (calId: string, payload: { name: string; start_time: string; end_time: string }) =>
    apiClient.post<ShiftTimingItem>(`/hrms/shifts/calendars/${calId}/timings`, payload),
  deleteCalendarShiftTiming: (calId: string, timingId: string) =>
    apiClient.delete<{ status: string; message: string }>(`/hrms/shifts/calendars/${calId}/timings/${timingId}`),

  // Shift Templates (Enterprise Shifts)
  getShiftTemplates: () => apiClient.get<ShiftTemplateItem[]>('/hrms/shifts/templates'),
  getShiftTemplateById: (templateId: string) => apiClient.get<ShiftTemplateItem>(`/hrms/shifts/templates/${templateId}`),
  saveShiftTemplate: (payload: Partial<ShiftTemplateItem>) => apiClient.post<ShiftTemplateItem>('/hrms/shifts/templates', payload),
  deleteShiftTemplate: (templateId: string) => apiClient.delete<{ status: string; message: string }>(`/hrms/shifts/templates/${templateId}`),

  getShiftRoster: (params?: { start_date?: string; end_date?: string; department?: string; search?: string; view?: string; user_type?: 'employee' | 'student'; branch_id?: string; ho_id?: string }) =>
    apiClient.get<ShiftRosterResponse>('/hrms/shifts/roster', { params }),
  getShiftCell: (employee_id: string, date: string) =>
    apiClient.get<any>('/hrms/shifts/roster/cell', { params: { employee_id, date } }),
  assignShift: (payload: {
    employee_ids?: string[];
    employee_id?: string;
    dates?: string[];
    date?: string;
    shift_code: string;
    shift_name?: string;
    start_time?: string;
    end_time?: string;
    shift_id?: string;
    is_off?: boolean;
  }) =>
    apiClient.post<{ status: string; message: string; updated_count: number }>('/hrms/shifts/assign', payload),

  // Company Holidays & Work Calendar Schemes
  getHolidays: (params?: { year?: number; type?: string; search?: string }) =>
    apiClient.get<CompanyHolidayItem[]>('/hrms/holidays', { params }),
  saveHoliday: (payload: Partial<CompanyHolidayItem>) =>
    apiClient.post<CompanyHolidayItem>('/hrms/holidays', payload),
  deleteHoliday: (holidayId: string) =>
    apiClient.delete<{ message: string; id: string }>(`/hrms/holidays/${holidayId}`),
  preseedHolidays: (year?: number) =>
    apiClient.post<{ status: string; message: string; inserted_count: number }>('/hrms/holidays/preseed', { year }),

  // Monthly Attendance Matrix & Punch
  getAttendanceMatrix: (params?: { year?: number; month?: number; department?: string; search?: string; user_type?: 'employee' | 'student' | string; branch_id?: string; ho_id?: string }) =>
    apiClient.get<AttendanceMatrixResponse>('/hrms/attendance/matrix', { params }),
  punchAttendance: (payload: {
    employee_id: string;
    action?: string;
    status?: string;
    time?: string;
    check_in?: string;
    check_out_time?: string;
    check_out?: string;
    date?: string;
    note?: string;
    notes?: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    location?: string;
    place?: string;
    method?: string;
    user_role?: string;
  }) => apiClient.post<any>('/hrms/attendance/punch', payload),

  // Password Reset (Students & Employees)
  resetPassword: (payload: { target_type: 'student' | 'employee' | string; target_id: string; new_password: string }) =>
    apiClient.post<{ status: string; message: string; target_id: string; target_name: string; email: string }>('/hrms/reset-password', payload),
};

export interface ShiftTimingItem {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface ShiftTemplateItem {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_hours?: number;
  break_mins: number;
  grace_period_mins: number;
  is_night_shift: boolean;
  color: string;
  is_active: boolean;
  assign_type?: string;    // 'employee' | 'student' | 'both'
  from_date?: string;      // YYYY-MM-DD
  to_date?: string;        // YYYY-MM-DD
  num_members?: number;    // headcount for this shift
  member_ids?: string[];   // list of assigned employee/student IDs
  work_days?: string[];    // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  branch_id?: string;
  ho_id?: string;
}

export interface WorkCalendarItem {
  id: string;
  name: string;
  calendar_type: string;
  department: string;
  is_default: boolean;
  default_shift_code: string;
  working_days: string[];
  weekly_off_days: string[];
  shift_timings?: ShiftTimingItem[];
  is_active: boolean;
  holidays_count?: number;
}

export interface CompanyHolidayItem {
  id?: string;
  calendar_id?: string;
  name: string;
  date: string;
  formatted_date?: string;
  day_name?: string;
  year?: number;
  holiday_type?: string;
  description?: string;
  is_optional?: boolean;
}

export interface DayMatrixCell {
  code: 'P' | 'A' | 'PL' | 'WO' | 'HOL' | 'HD' | '-';
  date: string;
  status_label: string;
  check_in?: string | null;
  check_out?: string | null;
  work_hours?: number | null;
  method?: string | null;
}

export interface EmployeeMatrixRow {
  id: string;
  code: string;
  name: string;
  department: string;
  designation: string;
  initials: string;
  avatar: string;
  present_count: number;
  absent_count: number;
  leave_count: number;
  payable_days: number;
  days: Record<string, DayMatrixCell>;
}

export interface AttendanceMatrixResponse {
  year: number;
  month: number;
  month_name: string;
  days_in_month: {
    day: number;
    day_letter: string;
    day_name: string;
    formatted: string;
    date_str: string;
    is_today: boolean;
    is_future: boolean;
  }[];
  summary: {
    present_today: number;
    absent: number;
    on_leave: number;
    avg_attendance_pct: number;
    total_profiles: number;
  };
  employees: EmployeeMatrixRow[];
  departments: string[];
}

export interface ShiftDayInfo {
  shift_code: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_off: boolean;
  color: string;
  time_range: string;
  attendance_status?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  is_present?: boolean;
}

export interface EmployeeRosterRow {
  id: string;
  code: string;
  name: string;
  initials: string;
  designation: string;
  department: string;
  avatar: string;
  shifts: Record<string, ShiftDayInfo>;
}

export interface ShiftRosterResponse {
  week_label: string;
  start_date: string;
  end_date: string;
  dates: {
    date: string;
    day_name: string;
    formatted: string;
    full_str: string;
    is_today: boolean;
  }[];
  summary: {
    general: number;
    morning: number;
    evening: number;
    night: number;
    weekly_offs: number;
  };
  employees: EmployeeRosterRow[];
  total_staff: number;
  departments: string[];
  shift_templates?: any[];
  template_summaries?: {
    id: string;
    code: string;
    name: string;
    start_time: string;
    end_time: string;
    time_range: string;
    color: string;
    count: number;
  }[];
}

