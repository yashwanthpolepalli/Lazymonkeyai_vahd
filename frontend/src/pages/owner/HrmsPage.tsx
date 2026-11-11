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
import { HrmsShiftRosterTab } from '@/components/hrms/HrmsShiftRosterTab';
import { HrmsWorkCalendarsTab } from '@/components/hrms/HrmsWorkCalendarsTab';
import { StudentManagementTab } from '@/components/hrms/StudentManagementTab';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import {
  hrmsApi,
  type ExitItem,
} from '@/services/hrmsApi';

type HrmsCategory =
  | 'Employee Management'
  | 'Attendance'
  | 'Leave'
  | 'Payroll'
  | 'Exit Management';

type StudentCategory = 'Student Directory' | 'Attendance' | 'Leave';

export function HrmsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const rawView = searchParams.get('view');
  const initialView = rawView === 'students' || rawTab === 'students' ? 'students' : 'employees';
  const initialTab = rawTab === 'employees' || !rawTab ? 'employees' : rawTab;

  // View Mode: Students View vs Employees View
  const [viewMode, setViewMode] = useState<'students' | 'employees'>(initialView);

  // Student Categories State
  const [studentCategory, setStudentCategory] = useState<StudentCategory>(() => {
    if (initialView === 'students') {
      if (rawTab === 'leave') return 'Leave';
      if (['attendance', 'daily_attendance', 'geofence', 'geofence_portal', 'face_recognition', 'gps_attendance', 'corrections'].includes(rawTab || '')) return 'Attendance';
      return 'Student Directory';
    }
    return 'Student Directory';
  });
  const [studentSubTab, setStudentSubTab] = useState<string>(() => {
    return rawTab && ['attendance', 'daily_attendance', 'geofence', 'geofence_portal', 'face_recognition', 'gps_attendance', 'corrections'].includes(rawTab)
      ? rawTab
      : 'attendance';
  });

  // State
  const [activeCategory, setActiveCategory] = useState<HrmsCategory>('Employee Management');
  const [activeSubTab, setActiveSubTab] = useState<string>(initialTab);

  // Data States — only the data actually rendered by this page. Each tab
  // (HrmsemployeesTab, HrmsLeaveTab, HrmsPayrollTab, HrmsAttendanceTab,
  // StudentManagementTab) fetches its own data on demand. Fetching all of
  // it here on mount caused a request-storm that made the page feel slow.
  const [exitRequests, setExitRequests] = useState<ExitItem[]>([]);
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

    if (viewMode === 'students' || rawView === 'students') {
      if (rawTab === 'leave') {
        setStudentCategory('Leave');
      } else if (
        ['attendance', 'daily_attendance', 'geofence', 'geofence_portal', 'face_recognition', 'gps_attendance', 'corrections'].includes(rawTab || '')
      ) {
        setStudentCategory('Attendance');
        if (rawTab) setStudentSubTab(rawTab);
      } else if (rawTab === 'directory' || rawTab === 'students' || !rawTab) {
        setStudentCategory('Student Directory');
      }
    }

    if (initialTab) {
      const normalizedTab = initialTab === 'employees'
        ? 'employees'
        : (initialTab === 'biometric' || initialTab === 'biometrics' || initialTab === 'attendance_settings' || initialTab === 'work_calendars')
        ? 'attendance'
        : initialTab;
      setActiveSubTab(normalizedTab);
      if (['employees', 'departments', 'designations', 'teams', 'documents', 'profile'].includes(initialTab)) {
        setActiveCategory('Employee Management');
      } else if (['attendance', 'attendance_settings', 'work_calendars', 'geofence', 'geofence_portal', 'daily_attendance', 'face_recognition', 'gps_attendance', 'shift_attendance', 'corrections', 'biometric', 'biometrics'].includes(initialTab)) {
        setActiveCategory('Attendance');
      } else if (initialTab === 'leave') {
        setActiveCategory('Leave');
      } else if (initialTab === 'payroll') {
        setActiveCategory('Payroll');
      } else if (initialTab === 'exit') {
        setActiveCategory('Exit Management');
      }
    }
  }, [initialTab, rawView, rawTab, canViewStudents, canViewEmployees, viewMode]);

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

  const switchStudentTab = (cat: StudentCategory, sub?: string) => {
    setStudentCategory(cat);
    const targetSub = sub || (
      cat === 'Student Directory' ? 'directory' :
        cat === 'Attendance' ? (studentSubTab || 'attendance') : 'leave'
    );
    if (cat === 'Attendance' && sub) {
      setStudentSubTab(sub);
    }
    setSearchParams({ view: 'students', tab: targetSub });
  };

  // Fetch only the data the page renders (Exit Management). The other tabs
  // load their own data on demand — no mount-time request storm.
  const fetchData = async () => {
    try {
      const exitRes = await hrmsApi.getExitRequests().catch(() => []);
      setExitRequests(Array.isArray(exitRes) ? exitRes : []);
    } catch (err) {
      console.error('Error fetching exit requests:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-3.5 w-full px-4 sm:px-6 py-4 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 0. PRIMARY SWITCH OPTION: STUDENTS VIEW vs EMPLOYEES VIEW      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          {canViewStudents && (
            <button
              type="button"
              onClick={() => {
                setViewMode('students');
                const targetTab = studentCategory === 'Attendance' ? (studentSubTab || 'attendance') : studentCategory === 'Leave' ? 'leave' : 'directory';
                setSearchParams({ view: 'students', tab: targetTab });
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs',
                viewMode === 'students'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              )}
            >
              <Icon name="users" size={15} className={viewMode === 'students' ? 'text-white' : 'text-slate-500'} />
              <span>Students View</span>
            </button>
          )}
          {canViewEmployees && (
            <button
              type="button"
              onClick={() => {
                setViewMode('employees');
                setSearchParams({ view: 'employees', tab: activeSubTab || 'employees' });
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs',
                viewMode === 'employees'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90'
              )}
            >
              <Icon name="user-check" size={15} className={viewMode === 'employees' ? 'text-white' : 'text-slate-500'} />
              <span>Employees View</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 pr-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0 shadow-2xs" />
          <span>{viewMode === 'students' ? (localStorage.getItem('ssdc_college_name') ? `${localStorage.getItem('ssdc_college_name')} • Student Management` : 'Student Management Portal') : 'VAHD Enterprise • Staff HRMS'}</span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. STUDENTS VIEW MODE                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'students' && (
        <div className="space-y-3.5">
          {/* Top Students Category Navigation Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                { id: 'Student Directory', label: 'Student Directory', icon: 'users' },
                { id: 'Attendance', label: 'Attendance', icon: 'clock' },
                { id: 'Leave', label: 'Leave', icon: 'calendar' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => switchStudentTab(cat.id as StudentCategory)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    studentCategory === cat.id
                      ? 'bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={cat.icon} size={15} className={studentCategory === cat.id ? 'text-purple-600' : 'text-slate-400'} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* VIEW: STUDENT DIRECTORY */}
          {studentCategory === 'Student Directory' && (
            <StudentManagementTab />
          )}

          {/* VIEW: ATTENDANCE (STUDENTS) */}
          {studentCategory === 'Attendance' && (
            <div className="space-y-3.5 animate-fade-in">
              {/* Sub-Pills Navigation for Student Attendance */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'attendance', label: 'Daily Attendance', icon: 'calendar-check' },
                  ...(isHoUser || geofencePortalEnabled
                    ? [{ id: 'geofence_portal', label: 'Attendance & Geofence Portal', icon: 'sliders' }]
                    : []),
                  { id: 'face_recognition', label: 'Face Recognition', icon: 'camera' },
                  { id: 'gps_attendance', label: 'GPS Attendance', icon: 'map-pin' },
                  { id: 'corrections', label: 'Attendance Corrections', icon: 'edit-3' },
                ].map((sub) => {
                  const isSelected =
                    studentSubTab === sub.id ||
                    (sub.id === 'attendance' && studentSubTab === 'daily_attendance') ||
                    (sub.id === 'geofence_portal' && studentSubTab === 'geofence');

                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setStudentSubTab(sub.id);
                        setSearchParams({ view: 'students', tab: sub.id });
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-300/40'
                          : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
                      }`}
                    >
                      <Icon name={sub.icon} size={14} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {studentSubTab === 'geofence_portal' || studentSubTab === 'geofence' ? (
                isHoUser || geofencePortalEnabled ? (
                  <HrmsGeofencePortal onSuccessToast={triggerToast} />
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-2xs text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                      <Icon name="lock" size={26} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Attendance &amp; Geofence Portal Disabled
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                      This page is controlled by Head Office. Access to the Attendance &amp; Geofence Portal is currently disabled for this branch or organization.
                    </p>
                  </div>
                )
              ) : studentSubTab === 'corrections' || studentSubTab === 'attendance-approve' || studentSubTab === 'approvals' ? (
                <HrmsAttendanceCorrectionsTab scope="student" onSuccessToast={triggerToast} />
              ) : (
                <HrmsAttendanceTab scope="student" onSuccessToast={triggerToast} />
              )}
            </div>
          )}

          {/* VIEW: LEAVE (STUDENTS) */}
          {studentCategory === 'Leave' && (
            <HrmsLeaveTab scope="student" onSuccessToast={triggerToast} />
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EMPLOYEES VIEW MODE                                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'employees' && (
        <div className="space-y-3.5">
          {/* Top HRMS Category Navigation Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 min-w-max">
              {[
                { id: 'Employee Management', label: 'Employee Directory', icon: 'users', permKey: 'hrms_employees' },
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
                  const val = perms['attendance.view'] ?? perms['geofence_portal.view'] ?? perms['face_recognition.view'] ?? perms['gps_attendance.view'] ?? perms['shift_attendance.view'] ?? perms['attendance_corrections.view'];
                  return val !== undefined ? !!val : true;
                }
                const val = perms[`${cat.permKey}.view`] ?? perms[cat.permKey];
                return val !== undefined ? !!val : true;
              }).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => switchTab(cat.id as HrmsCategory)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon name={cat.icon} size={15} className={activeCategory === cat.id ? 'text-purple-600' : 'text-slate-400'} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* VIEW: EMPLOYEE DIRECTORY */}
          {activeCategory === 'Employee Management' && (
            <HrmsemployeesTab />
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
                        : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
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
                  <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-2xs text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                      <Icon name="lock" size={26} />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Attendance &amp; Geofence Portal Disabled
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
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
                <HrmsAttendanceCorrectionsTab scope="employee" onSuccessToast={triggerToast} />
              ) : activeSubTab === 'shift_attendance' || activeSubTab === 'shifts' || activeSubTab === 'shift_roster' ? (
                <HrmsShiftRosterTab onSuccessToast={triggerToast} />
              ) : (
                <HrmsAttendanceTab scope="employee" onSuccessToast={triggerToast} />
              )}
            </div>
          )}


          {/* ───────────────────────────────────────────────────────────── */}
          {/* 9. VIEW: LEAVE MANAGEMENT (Module 3)                          */}
          {/* ───────────────────────────────────────────────────────────── */}
          {activeCategory === 'Leave' && (
            <HrmsLeaveTab scope="employee" onSuccessToast={triggerToast} />
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
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Exit Management & Handover</h2>
                <p className="text-xs text-slate-500">Employee resignations, equipment handover checklists, and final clearance.</p>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-100">
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
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-800">
                    {exitRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                          No exit requests logged.
                        </td>
                      </tr>
                    ) : (
                      exitRequests.map((x) => (
                        <tr key={x.id} className="hover:bg-slate-50/40">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{x.employee_name}</td>
                          <td className="py-3.5 px-4 font-mono">{x.resignation_date}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{x.last_working_day}</td>
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">{x.reason || '--'}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                              {x.handover_status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
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
