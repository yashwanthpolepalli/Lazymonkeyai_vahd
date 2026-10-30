import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { HrmsemployeesTab } from '@/components/hrms/HrmsemployeesTab';
import { HrmsDepartmentsTab } from '@/components/hrms/HrmsDepartmentsTab';
import { HrmsDesignationsTab } from '@/components/hrms/HrmsDesignationsTab';
import { HrmsAttendanceTab } from '@/components/hrms/HrmsAttendanceTab';
import { HrmsGeofencePortal } from '@/components/hrms/HrmsGeofencePortal';
import { HrmsLeaveTab } from '@/components/hrms/HrmsLeaveTab';
import { HrmsPayrollTab } from '@/components/hrms/HrmsPayrollTab';
import { HrmsAttendanceCorrectionsTab } from '@/components/hrms/HrmsAttendanceCorrectionsTab';
import { StudentManagementTab } from '@/components/hrms/StudentManagementTab';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import {
  hrmsApi,
  type DepartmentItem,
  type DesignationItem,
  type TeamItem,
  type DocumentItem,
  type AttendanceRecord,
  type LeaveItem,
  type PayrollItem,
  type ExitItem,
} from '@/services/hrmsApi';

type HrmsCategory =
  | 'Employee Management'
  | 'Attendance'
  | 'Leave'
  | 'Payroll'
  | 'Exit Management';

export function HrmsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const rawView = searchParams.get('view');
  const initialView = rawView === 'students' || rawTab === 'students' || rawTab === 'students' ? 'students' : 'employees';
  const initialTab = rawTab === 'employees' || !rawTab ? 'employees' : rawTab;

  // View Mode: Students View vs Employees View
  const [viewMode, setViewMode] = useState<'students' | 'employees'>(initialView);

  // State
  const [activeCategory, setActiveCategory] = useState<HrmsCategory>('Employee Management');
  const [activeSubTab, setActiveSubTab] = useState<string>(initialTab);

  // Data States
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [designations, setDesignations] = useState<DesignationItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [payroll, setPayroll] = useState<PayrollItem[]>([]);
  const [exitRequests, setExitRequests] = useState<ExitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { user } = useAuth();
  const isHoUser = user?.role === 'ho' || user?.role === 'super_admin';
  const [geofencePortalEnabled, setGeofencePortalEnabled] = useState<boolean>(true);

  // Check branch-specific Geofence Portal authorization
  useEffect(() => {
    const checkBranchGeofenceStatus = async () => {
      if (isHoUser) {
        setGeofencePortalEnabled(true);
        return;
      }
      try {
        const branchKey = localStorage.getItem('vahd_selected_org_id') || user?.branch_id || 'all';
        const res = await apiClient.get<any[]>('/settings/branches').catch(() => []);
        if (Array.isArray(res) && res.length > 0) {
          const matched =
            branchKey && branchKey !== 'all'
              ? res.find((b) => b.id === branchKey || b.branch_name === branchKey)
              : res.find((b) => b.id === user?.branch_id) || res[0];
          setGeofencePortalEnabled(Boolean(matched?.geofence_portal_enabled));
        } else {
          setGeofencePortalEnabled(false);
        }
      } catch (e) {
        setGeofencePortalEnabled(false);
      }
    };
    checkBranchGeofenceStatus();

    const handleOrgChanged = () => {
      checkBranchGeofenceStatus();
      fetchData();
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    window.addEventListener('vahd:branch_geofence_toggled', handleOrgChanged);
    return () => {
      window.removeEventListener('vahd:org_changed', handleOrgChanged);
      window.removeEventListener('vahd:branch_geofence_toggled', handleOrgChanged);
    };
  }, [user, isHoUser]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Permission guards for primary views
  const canViewStudents = useMemo(() => {
    if (isHoUser || !user?.permissions || Object.keys(user.permissions).length === 0) return true;
    const perms = user.permissions;
    const val = perms['students_section.view'] ?? perms['student_details.view'] ?? perms['student_enrollment.view'] ?? perms['student_attendance.view'];
    return val !== undefined ? !!val : true;
  }, [isHoUser, user?.permissions]);

  const canViewEmployees = useMemo(() => {
    if (isHoUser || !user?.permissions || Object.keys(user.permissions).length === 0) return true;
    const perms = user.permissions;
    const val = perms['hrms_section.view'] ?? perms['employee_details.view'] ?? perms['attendance.view'] ?? perms['leave_management.view'] ?? perms['payroll.view'] ?? perms['exit_management.view'];
    return val !== undefined ? !!val : true;
  }, [isHoUser, user?.permissions]);

  // Sync tab with URL
  useEffect(() => {
    if (!canViewStudents && canViewEmployees && viewMode === 'students') {
      setViewMode('employees');
    } else if (!canViewEmployees && canViewStudents && viewMode === 'employees') {
      setViewMode('students');
    }
    if (rawView === 'students' || rawTab === 'students') {
      if (canViewStudents) setViewMode('students');
    }
    if (initialTab) {
      const normalizedTab = initialTab === 'employees' ? 'employees' : initialTab;
      setActiveSubTab(normalizedTab);
      if (['employees', 'employees', 'departments', 'designations', 'teams', 'documents', 'profile'].includes(initialTab)) {
        setActiveCategory('Employee Management');
      } else if (['attendance', 'biometrics', 'geofence', 'geofence_portal', 'daily_attendance', 'biometric', 'face_recognition', 'gps_attendance', 'shift_attendance', 'corrections'].includes(initialTab)) {
        setActiveCategory('Attendance');
      } else if (initialTab === 'leave') {
        setActiveCategory('Leave');
      } else if (initialTab === 'payroll') {
        setActiveCategory('Payroll');
      } else if (initialTab === 'exit') {
        setActiveCategory('Exit Management');
      }
    }
  }, [initialTab, rawView, rawTab]);

  const switchTab = (cat: HrmsCategory, sub?: string) => {
    setActiveCategory(cat);
    const targetSub = sub || (
      cat === 'Employee Management' ? 'employees' :
        cat === 'Attendance' ? 'attendance' :
          cat === 'Leave' ? 'leave' :
            cat === 'Payroll' ? 'payroll' : 'exit'
    );
    setActiveSubTab(targetSub);
    setSearchParams({ view: 'employees', tab: targetSub });
  };

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, desgRes, teamRes, docRes] = await Promise.all([
        hrmsApi.getDepartments(),
        hrmsApi.getDesignations(),
        hrmsApi.getTeams(),
        hrmsApi.getDocuments(),
      ]);
      setDepartments(deptRes || []);
      setDesignations(desgRes || []);
      setTeams(teamRes || []);
      setDocuments(docRes || []);

      // Fetch supplementary modules
      const [attRes, leaveRes, payRes, exitRes] = await Promise.all([
        hrmsApi.getAttendance(),
        hrmsApi.getLeaves(),
        hrmsApi.getPayroll(),
        hrmsApi.getExitRequests(),
      ]);
      setAttendanceLogs(attRes || []);
      setLeaves(leaveRes || []);
      setPayroll(payRes || []);
      setExitRequests(exitRes || []);
    } catch (err) {
      console.error('Error fetching HRMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-4 w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-brand-500/30 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-brand-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 0. PRIMARY SWITCH OPTION: STUDENTS VIEW vs EMPLOYEES VIEW      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-2.5 shadow-xs">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
          {canViewStudents && (
            <button
              type="button"
              onClick={() => {
                setViewMode('students');
                setSearchParams({ view: 'students' });
              }}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200',
                viewMode === 'students'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon name="users" size={16} className={viewMode === 'students' ? 'text-blue-600' : 'text-slate-500'} />
              <span>Students View</span>
            </button>
          )}
          {canViewEmployees && (
            <button
              type="button"
              onClick={() => {
                setViewMode('employees');
                setSearchParams({ view: 'employees' });
              }}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200',
                viewMode === 'employees'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700 scale-[1.01]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon name="user-check" size={16} className={viewMode === 'employees' ? 'text-blue-600' : 'text-slate-500'} />
              <span>Employees View</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 pr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{viewMode === 'students' ? (localStorage.getItem('ssdc_college_name') ? `${localStorage.getItem('ssdc_college_name')} • Student Management` : 'Student Management Portal') : 'VAHD Enterprise • Staff HRMS'}</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. STUDENTS VIEW MODE                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'students' && (
        <StudentManagementTab />
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EMPLOYEES VIEW MODE                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'employees' && (
        <div className="space-y-4">
          {/* Top HRMS Category Navigation Bar */}
          <div className="bg-white border border-navy-100 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {[
                { id: 'Employee Management', label: 'Employee Management', icon: 'users', permKey: 'hrms_employees' },
                { id: 'Attendance', label: 'Attendance', icon: 'clock', permKey: 'hrms_attendance' },
                { id: 'Leave', label: 'Leave', icon: 'calendar', permKey: 'leave_management' },
                { id: 'Payroll', label: 'Payroll', icon: 'credit-card', permKey: 'payroll' },
                { id: 'Exit Management', label: 'Exit Management', icon: 'log-out', permKey: 'exit_management' },
              ].filter((cat) => {
                if (isHoUser || !user?.permissions || Object.keys(user.permissions).length === 0) return true;
                const perms = user.permissions;
                if (cat.id === 'Employee Management') {
                  const val = perms['hrms_section.view'] ?? perms['employee_details.view'] ?? perms['hrms_departments.view'] ?? perms['hrms_designations.view'] ?? perms['hrms_teams.view'] ?? perms['hrms_documents.view'];
                  return val !== undefined ? !!val : true;
                }
                if (cat.id === 'Attendance') {
                  const val = perms['attendance.view'] ?? perms['geofence_portal.view'] ?? perms['biometrics.view'] ?? perms['face_recognition.view'] ?? perms['gps_attendance.view'] ?? perms['shift_attendance.view'] ?? perms['attendance_corrections.view'];
                  return val !== undefined ? !!val : true;
                }
                const val = perms[`${cat.permKey}.view`] ?? perms[cat.permKey];
                return val !== undefined ? !!val : true;
              }).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => switchTab(cat.id as HrmsCategory)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeCategory === cat.id
                    ? 'bg-purple-50 text-purple-700 border border-purple-200/80 shadow-sm'
                    : 'text-navy-600 hover:text-navy-900 hover:bg-navy-50'
                    }`}
                >
                  <Icon name={cat.icon} size={15} className={activeCategory === cat.id ? 'text-purple-600' : 'text-navy-400'} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Pills Under Employee Management */}
          {activeCategory === 'Employee Management' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'employees', label: 'Employee Directory', icon: 'user-cog', permKey: 'employee_details' },
                { id: 'departments', label: 'Departments', icon: 'building-2', permKey: 'hrms_departments' },
                { id: 'designations', label: 'Designations', icon: 'award', permKey: 'hrms_designations' },
                { id: 'teams', label: 'Teams', icon: 'users-2', permKey: 'hrms_teams' },
                { id: 'documents', label: 'Documents', icon: 'file-text', permKey: 'hrms_documents' },
              ].filter((sub) => {
                if (isHoUser || !user?.permissions || Object.keys(user.permissions).length === 0) return true;
                const perms = user.permissions;
                const val = perms[`${sub.permKey}.view`] ?? perms[sub.permKey] ?? perms[`${sub.id}.view`];
                return val !== undefined ? !!val : true;
              }).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubTab(sub.id);
                    setSearchParams({ view: 'employees', tab: sub.id });
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeSubTab === sub.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/60'
                    }`}
                >
                  <Icon name={sub.icon} size={14} />
                  <span>{sub.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 2B. VIEW: employeeS DIRECTORY                                  */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Employee Management' && (activeSubTab === 'employees' || activeSubTab === 'employees') && (
            <HrmsemployeesTab />
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 4. VIEW: DEPARTMENTS                                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Employee Management' && activeSubTab === 'departments' && (
            <HrmsDepartmentsTab />
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 5. VIEW: DESIGNATIONS                                         */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Employee Management' && activeSubTab === 'designations' && (
            <HrmsDesignationsTab />
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 6. VIEW: TEAMS                                                */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Employee Management' && activeSubTab === 'teams' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-navy-900 tracking-tight">Functional Teams</h2>
                <p className="text-xs text-navy-500">Operational units collaborating across specialized fitness tracks.</p>
              </div>

              {teams.length === 0 ? (
                <div className="card p-12 text-center text-navy-400 bg-white border border-navy-100 rounded-2xl">
                  No teams created yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <div key={team.id} className="card p-5 bg-white border border-navy-100 rounded-2xl shadow-sm space-y-3">
                      <h4 className="text-sm font-bold text-navy-900">{team.name}</h4>
                      <p className="text-xs text-navy-500 leading-snug">{team.description || team.department}</p>
                      {team.lead_name && (
                        <div className="pt-2 border-t border-navy-50 flex items-center justify-between text-xs">
                          <span className="text-navy-400">Team Lead:</span>
                          <span className="font-bold text-purple-700">{team.lead_name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 7. VIEW: DOCUMENTS                                            */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Employee Management' && activeSubTab === 'documents' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-navy-900 tracking-tight">Employee Documents</h2>
                <p className="text-xs text-navy-500">Verified KYC identity proofs, employee certifications, and contracts.</p>
              </div>

              <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/50 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3.5 px-4">DOCUMENT TITLE</th>
                      <th className="py-3.5 px-4">EMPLOYEE</th>
                      <th className="py-3.5 px-4">TYPE</th>
                      <th className="py-3.5 px-4">FILE SIZE</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4">UPLOADED DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-navy-400 font-bold">
                          No documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-navy-50/40">
                          <td className="py-3.5 px-4 font-bold text-navy-900 flex items-center gap-2">
                            <Icon name="file-text" size={15} className="text-purple-600 shrink-0" />
                            {doc.title}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-purple-700">{doc.employee_name || '--'}</td>
                          <td className="py-3.5 px-4">{doc.doc_type || '--'}</td>
                          <td className="py-3.5 px-4 font-mono text-navy-500">{doc.file_size || '--'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-navy-500">{doc.uploaded_at || '--'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 8. VIEW: ATTENDANCE & GEOFENCING (Module 2)                    */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Attendance' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Sub-Pills Navigation matching Screenshot 2 */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'attendance', label: 'Daily Attendance', icon: 'calendar-check', permKey: 'attendance' },
                  ...(isHoUser || geofencePortalEnabled
                    ? [{ id: 'geofence_portal', label: 'Attendance & Geofence Portal', icon: 'sliders', permKey: 'geofence_portal' }]
                    : []),
                  { id: 'biometric', label: 'Biometric', icon: 'fingerprint', permKey: 'biometrics' },
                  { id: 'face_recognition', label: 'Face Recognition', icon: 'camera', permKey: 'face_recognition' },
                  { id: 'gps_attendance', label: 'GPS Attendance', icon: 'map-pin', permKey: 'gps_attendance' },
                  { id: 'shift_attendance', label: 'Shift Attendance', icon: 'clock', permKey: 'shift_attendance' },
                  { id: 'corrections', label: 'Attendance Corrections', icon: 'edit-3', permKey: 'attendance_corrections' },
                ].filter((sub) => {
                  if (isHoUser || !user?.permissions || Object.keys(user.permissions).length === 0) return true;
                  const perms = user.permissions;
                  const val = perms[`${sub.permKey}.view`] ?? perms[sub.permKey] ?? perms[`${sub.id}.view`];
                  return val !== undefined ? !!val : true;
                }).map((sub) => {
                  const isSelected =
                    activeSubTab === sub.id ||
                    (sub.id === 'attendance' && activeSubTab === 'daily_attendance') ||
                    (sub.id === 'geofence_portal' && activeSubTab === 'geofence');

                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveSubTab(sub.id);
                        setSearchParams({ tab: sub.id });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-300/40'
                        : 'bg-white hover:bg-navy-50 text-navy-600 border border-navy-200/80'
                        }`}
                    >
                      <Icon name={sub.icon} size={14} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Conditional View */}
              {activeSubTab === 'geofence_portal' || activeSubTab === 'geofence' ? (
                isHoUser || geofencePortalEnabled ? (
                  <HrmsGeofencePortal onSuccessToast={triggerToast} />
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-navy-100 shadow-2xs text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                      <Icon name="lock" size={26} />
                    </div>
                    <h3 className="text-base font-extrabold text-navy-900">
                      Attendance &amp; Geofence Portal Disabled
                    </h3>
                    <p className="text-xs text-navy-500 max-w-md mx-auto font-medium">
                      This page is controlled by Head Office. Access to the Attendance &amp; Geofence Portal is currently disabled for this branch or organization.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSubTab('attendance');
                        setSearchParams({ tab: 'attendance' });
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition"
                    >
                      Return to Daily Attendance
                    </button>
                  </div>
                )
              ) : activeSubTab === 'corrections' || activeSubTab === 'attendance-approve' || activeSubTab === 'approvals' ? (
                <HrmsAttendanceCorrectionsTab onSuccessToast={triggerToast} />
              ) : (
                <HrmsAttendanceTab attendanceLogs={attendanceLogs} />
              )}
            </div>
          )}


          {/* ───────────────────────────────────────────────────────────── */}
          {/* 9. VIEW: LEAVE MANAGEMENT (Module 3)                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Leave' && (
            <HrmsLeaveTab onSuccessToast={triggerToast} />
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* 10. VIEW: PAYROLL (Module 4)                                   */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Payroll' && (
            <HrmsPayrollTab onSuccessToast={triggerToast} />
          )}



          {/* ───────────────────────────────────────────────────────────── */}
          {/* 13. VIEW: EXIT MANAGEMENT (Module 9)                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Exit Management' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-navy-900 tracking-tight">Exit Management & Handover</h2>
                <p className="text-xs text-navy-500">Employee resignations, equipment handover checklists, and final clearance.</p>
              </div>

              <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-navy-50/50 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                    <tr>
                      <th className="py-3.5 px-4">EMPLOYEE</th>
                      <th className="py-3.5 px-4">RESIGNATION DATE</th>
                      <th className="py-3.5 px-4">LAST WORKING DAY</th>
                      <th className="py-3.5 px-4">REASON</th>
                      <th className="py-3.5 px-4">HANDOVER</th>
                      <th className="py-3.5 px-4">SETTLEMENT</th>
                      <th className="py-3.5 px-4">STATUS</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                    {exitRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-navy-400 font-bold">
                          No exit requests logged.
                        </td>
                      </tr>
                    ) : (
                      exitRequests.map((x) => (
                        <tr key={x.id} className="hover:bg-navy-50/40">
                          <td className="py-3.5 px-4 font-bold text-navy-900">{x.employee_name}</td>
                          <td className="py-3.5 px-4 font-mono">{x.resignation_date}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{x.last_working_day}</td>
                          <td className="py-3.5 px-4 text-navy-600 max-w-xs">{x.reason || '--'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              {x.handover_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-navy-100 text-navy-700">
                              {x.settlement_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                              {x.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={async () => {
                                await hrmsApi.updateExitStatus(x.id, {
                                  status: 'Completed',
                                  handover_status: 'Completed',
                                  settlement_status: 'Cleared',
                                });
                                triggerToast(`Completed clearance and settlement for ${x.employee_name}`);
                                fetchData();
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition"
                            >
                              Clear Settlement
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
