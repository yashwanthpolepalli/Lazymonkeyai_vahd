import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { hrmsApi, EmployeeItem, DepartmentItem, AttendanceRecord } from '@/services/hrmsApi';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';

// Sample district list matching VAHD government portal standards
const DISTRICTS = [
  'All Districts',
  'Adilabad',
  'Bhadradri Kothagudem',
  'Hanumakonda',
  'Hyderabad',
  'Jagitial',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Jogulamba Gadwal',
  'Kamareddy',
  'Karimnagar',
  'Khammam',
  'Kumuram Bheem Asifabad',
  'Mahabubabad',
  'Mahabubnagar',
  'Mancherial',
  'Medak',
  'Medchal Malkajgiri',
  'Mulugu',
  'Nagarkurnool',
  'Nalgonda',
  'Narayanpet',
  'Nirmal',
  'Nizamabad',
  'Peddapalli',
  'Rajanna Sircilla',
  'Rangareddy',
  'Sangareddy',
  'Siddipet',
  'Suryapet',
  'Vikarabad',
  'Wanaparthy',
  'Warangal',
  'Yadadri Bhuvanagiri'
];

const PLACES_OF_WORKING = [
  'All Places',
  'SC(AH) Gattusingaram',
  'SC(AH) Kodakanchi',
  'SC(AH) Linganavai',
  'PVC Pudur',
  'PVC Bela',
  'PVC Day Naik Tanda',
  'PVC Gimma',
  'AVH Boath',
  'AVH Utnoor',
  'DVAHO Adilabad',
  'DVH Adilabad',
  'ADDL Adilabad',
  'Jinnawaram, Hyderabad',
  'Kushmanchi, Telangana',
  'Alampur, Gadwal',
  'PVC Vemulapally',
  'PVC Marriguda'
];

export type ReportType =
  | 'student-attendance'
  | 'employee-attendance'
  | 'branch-consolidated'
  | 'daily-attendance'
  | 'daily-abstract'
  | 'attendance-abstract'
  | 'range-attendance'
  | 'late-attendance-report'
  | 'not-logged-out-report'
  | 'not-logged-out-abstract'
  | 'late-attendance-abstract'
  | 'early-leaving-abstract'
  | 'registered-unregistered-users'
  | 'districts-abstract'
  | 'departments-abstract'
  | 'designations-abstract'
  | 'payroll-summary'
  | 'leave-breakdown'
  | 'geofence-audits';

interface ReportCardConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
  category?: 'all' | 'students' | 'employees' | 'branches';
}

const combinedAttendanceCards: ReportCardConfig[] = [
  {
    id: 'student-attendance',
    title: 'Student Attendance Report',
    description: 'Monthly student biometric attendance, course performance and downloadable CSV & PDF statements.',
    icon: 'graduation-cap',
    iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    iconColor: 'text-blue-600',
    badge: 'STUDENTS',
    category: 'students',
  },
  {
    id: 'employee-attendance',
    title: 'Employee Attendance Report',
    description: 'Staff biometric statements, monthly work hours breakdown, presents/absents and downloadable statements.',
    icon: 'user-check',
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'EMPLOYEES',
    category: 'employees',
  },
  {
    id: 'branch-consolidated',
    title: 'Multi-Branch Consolidated Report',
    description: 'Head Office multi-campus attendance consolidated overview with direct Excel spreadsheets and PDF statements.',
    icon: 'building-2',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    iconColor: 'text-purple-600',
    badge: 'MULTI-BRANCH',
    category: 'branches',
  },
  {
    id: 'daily-attendance',
    title: 'Daily Attendance Report',
    description: 'Detailed shift check-in/out logs per employee with geofence & verification mode.',
    icon: 'clipboard-check',
    iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
    iconColor: 'text-sky-600',
    category: 'employees',
  },
  {
    id: 'daily-abstract',
    title: 'Daily Abstract',
    description: 'Institute & campus aggregated present, late, absent counts and percentages.',
    icon: 'bar-chart-2',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    id: 'attendance-abstract',
    title: 'Attendance Abstract',
    description: 'Institute & campus working summaries, branch operational status and roster ratios.',
    icon: 'table',
    iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'range-attendance',
    title: 'Range Attendance',
    description: 'Custom date range shift analysis, multi-day summaries and exportable roster matrices.',
    icon: 'calendar',
    iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    id: 'late-attendance-report',
    title: 'Late Attendance Report',
    description: 'Log of staff arriving past grace period with timestamp variance & penalty markers.',
    icon: 'clock',
    iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    id: 'not-logged-out-report',
    title: 'Not Logged Out Report',
    description: 'Employees with missing clock-out timestamps requiring administrative override.',
    icon: 'alert-circle',
    iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    iconColor: 'text-rose-600',
  },
];

const dailyAbstractCards: ReportCardConfig[] = [
  {
    id: 'not-logged-out-abstract',
    title: 'Not Logged Out Abstract',
    description: 'Institute-wise consolidated headcount of open shifts and auto-closed logs',
    icon: 'alert-triangle',
    iconBg: 'bg-orange-50 text-orange-600 border border-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    id: 'late-attendance-abstract',
    title: 'Late Attendance Abstract',
    description: 'Institute-wise aggregate of late check-ins and average delay minutes',
    icon: 'hourglass',
    iconBg: 'bg-yellow-50 text-yellow-600 border border-yellow-100',
    iconColor: 'text-yellow-600',
  },
  {
    id: 'early-leaving-abstract',
    title: 'Early Leaving Abstract',
    description: 'Headcount metrics on departures prior to scheduled shift end across departments',
    icon: 'trending-down',
    iconBg: 'bg-red-50 text-red-600 border border-red-100',
    iconColor: 'text-red-600',
  },
  {
    id: 'registered-unregistered-users',
    title: 'Registered vs Unregistered',
    description: 'Biometric & face ID enrolment status breakdown across all institutions',
    icon: 'scan-face',
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'districts-abstract',
    title: 'Institutes Abstract',
    description: 'High-level executive comparison matrix across all registered institutes and campuses',
    icon: 'map-pin',
    iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
    iconColor: 'text-teal-600',
  },
];

const hrmsAnalyticsCards: ReportCardConfig[] = [
  {
    id: 'departments-abstract',
    title: 'Departments Abstract',
    description: 'Breakdown by , Administration, Field Staff, Laboratory and Research wings',
    icon: 'building-2',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    id: 'designations-abstract',
    title: 'Designations Abstract',
    description: 'Attendance fidelity categorized by rank: DVAHO, VAS,  Assistant, Attenders',
    icon: 'users',
    iconBg: 'bg-violet-50 text-violet-600 border border-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    id: 'payroll-summary',
    title: 'Payroll & Salary Summary',
    description: 'Monthly payable days, total working hours, loss of pay (LOP) deductions',
    icon: 'credit-card',
    iconBg: 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100',
    iconColor: 'text-fuchsia-600',
  },
  {
    id: 'leave-breakdown',
    title: 'Leave & Absence Breakdown',
    description: 'Casual, earned, medical, and on-duty (OD) field tour tracking and balances',
    icon: 'calendar',
    iconBg: 'bg-pink-50 text-pink-600 border border-pink-100',
    iconColor: 'text-pink-600',
  },
  {
    id: 'geofence-audits',
    title: 'Geofence / Location Audits',
    description: 'GPS coordinates audit logs, accuracy radius tolerances and mock-location flags',
    icon: 'shield',
    iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
    iconColor: 'text-slate-700',
  },
];

export interface BranchItem {
  id: string;
  branch_name: string;
  vahd_name?: string;
  name?: string;
  city?: string;
  district?: string;
}

export function ReportsPage({ embedded = false }: { embedded?: boolean }) {
  // Navigation & Active Sub-view
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [searchReportDirectory, setSearchReportDirectory] = useState('');

  // Live Data from API
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [dailyAttendeeType, setDailyAttendeeType] = useState<'all' | 'employees' | 'students'>('all');
  const [loading, setLoading] = useState(true);

  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Common Filters for Drill-Downs
  const [filterInstitute, setFilterInstitute] = useState('All Institutes');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const filterDistrict = filterInstitute;
  const setFilterDistrict = setFilterInstitute;
  const [filterPlace, setFilterPlace] = useState('All Branches');
  const [filterDate, setFilterDate] = useState(() => getTodayDateStr());
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [filterToDate, setFilterToDate] = useState(() => getTodayDateStr());
  const [filterCheckinTime, setFilterCheckinTime] = useState('');
  const [filterCheckoutTime, setFilterCheckoutTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterInstType, setFilterInstType] = useState('All Types');
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [rangeTabMode, setRangeTabMode] = useState<'Report' | 'Detail' | 'Abstract'>('Report');
  const [attendanceMatrix, setAttendanceMatrix] = useState<any>(null);
  const [rangeMetric, setRangeMetric] = useState<'Present' | 'Absent'>('Present');

  // Monthly Attendance State for Students, Employees & Multi-Branch
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState<number>(new Date().getMonth() + 1);
  const [studentsOverview, setStudentsOverview] = useState<any | null>(null);
  const [employeesOverview, setEmployeesOverview] = useState<any | null>(null);
  const [branchReportsData, setBranchReportsData] = useState<any | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);
  const [hubCategory, setHubCategory] = useState<'all' | 'students' | 'employees' | 'branches'>('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('vahd_selected_org_id') || 'all';
  });
  const [allBranchesList, setAllBranchesList] = useState<BranchItem[]>([]);

  // Synchronize with Topbar organization / branch switcher
  useEffect(() => {
    const handleOrgChanged = (e: any) => {
      if (e.detail?.id) {
        setSelectedBranch(e.detail.id);
      }
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
  }, []);

  // Fetch full list of campus organizations and branches for the branch selector
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const vBranches = await apiClient.get<any[]>('/vahd/branches').catch(() => []);
        if (Array.isArray(vBranches) && vBranches.length > 0) {
          setAllBranchesList(
            vBranches.map((br: any) => ({
              id: br.id,
              branch_name: br.branch_name || br.name || '',
              vahd_name: br.vahd_name || br.name || '',
              name: br.name || br.vahd_name || br.branch_name || '',
              city: br.city || br.district || '',
              district: br.district || br.city || '',
            }))
          );
          return;
        }
      } catch {}
      try {
        const res = await apiClient.get<any>(`/ho/attendance-reports/branches?year=${targetYear}&month=${targetMonth}`);
        if (res?.branches && Array.isArray(res.branches)) {
          setAllBranchesList(
            res.branches.map((br: any) => ({
              id: br.branch_id,
              branch_name: br.branch_name,
              vahd_name: br.vahd_name,
              name: br.name || br.vahd_name || br.branch_name || '',
              city: br.city || br.district || '',
              district: br.district || br.city || '',
            }))
          );
        }
      } catch {}
    };
    loadBranches();
  }, [targetYear, targetMonth]);

  const fetchMonthlyOverviews = async (y = targetYear, m = targetMonth, b = selectedBranch) => {
    setLoadingMonthly(true);
    try {
      const branchParam = b && b !== 'all' ? `&branch_id=${encodeURIComponent(b)}` : '';
      const [studRes, empRes, hoRes] = await Promise.all([
        apiClient.get<any>(`/students/attendance-reports/overview?year=${y}&month=${m}${branchParam}`).catch(() => null),
        apiClient.get<any>(`/hrms/attendance-reports/overview?year=${y}&month=${m}${branchParam}`).catch(() => null),
        apiClient.get<any>(`/ho/attendance-reports/branches?year=${y}&month=${m}${branchParam}`).catch(() => null),
      ]);
      setStudentsOverview(studRes);
      setEmployeesOverview(empRes);
      setBranchReportsData(hoRes);

      if (hoRes?.branches && Array.isArray(hoRes.branches) && allBranchesList.length === 0) {
        setAllBranchesList(
          hoRes.branches.map((br: any) => ({
            id: br.branch_id,
            branch_name: br.branch_name,
            vahd_name: br.vahd_name,
            name: br.name || br.vahd_name || br.branch_name || '',
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load monthly attendance overviews:', e);
    } finally {
      setLoadingMonthly(false);
    }
  };

  useEffect(() => {
    fetchMonthlyOverviews(targetYear, targetMonth, selectedBranch);
  }, [targetYear, targetMonth, selectedBranch]);

  // Load backend data dynamically based on selected date
  const fetchData = async (dateToFetch?: string) => {
    setLoading(true);
    try {
      const targetDate = dateToFetch || filterDate;
      const dateParts = targetDate.split('-');
      const y = parseInt(dateParts[0], 10);
      const m = parseInt(dateParts[1], 10);

      const branchIdParam = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
      const [empRes, deptRes, attRes, matrixRes, stuRes] = await Promise.all([
        hrmsApi.getEmployees({ branch_id: branchIdParam }).catch(() => []),
        hrmsApi.getDepartments().catch(() => []),
        hrmsApi.getAttendance(targetDate, branchIdParam).catch(() => []),
        (y && m) ? hrmsApi.getAttendanceMatrix({ year: y, month: m, user_type: 'all', branch_id: branchIdParam }).catch(() => null) : Promise.resolve(null),
        apiClient.get<any[]>('/students', { params: branchIdParam ? { branch_id: branchIdParam } : undefined }).catch(() => [])
      ]);
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
      setStudents(Array.isArray(stuRes) ? stuRes : []);
      if (matrixRes) setAttendanceMatrix(matrixRes);

      const combinedAtt = Array.isArray(attRes) ? [...attRes] : [];
      // Merge verified punches from monthly matrix if any are missing or have status mismatch
      if (matrixRes?.employees && Array.isArray(matrixRes.employees)) {
        let dayNum = 0;
        if (targetDate.includes('-')) {
          const parts = targetDate.split('-');
          dayNum = parseInt(parts[parts.length - 1], 10);
        } else if (targetDate.includes('/')) {
          const parts = targetDate.split('/');
          dayNum = parseInt(parts[0], 10);
        }

        if (dayNum > 0) {
          matrixRes.employees.forEach((mEmp: any) => {
            const dInfo = mEmp.days?.[dayNum] || mEmp.days?.[String(dayNum)];
            const isPres =
              dInfo &&
              (dInfo.code === 'P' ||
                dInfo.code === 'HD' ||
                dInfo.status === 'P' ||
                dInfo.status === 'Present' ||
                dInfo.status_label === 'Present' ||
                (dInfo.check_in && dInfo.check_in !== '--:--' && dInfo.check_in !== '-'));

            if (dInfo && isPres) {
              const mCleanCode = (mEmp.code || '').replace(/\D/g, '');
              const mCleanId = (mEmp.id || '').replace(/^emp_/i, '').toLowerCase();
              const mName = (mEmp.name || '').toLowerCase().trim();

              const existing = combinedAtt.find((a) => {
                const aCleanCode = (a.employee_code || '').replace(/\D/g, '');
                const aCleanId = (a.employee_id || '').replace(/^emp_/i, '').toLowerCase();
                const aName = (a.employee_name || '').toLowerCase().trim();
                return (
                  (aCleanCode && mCleanCode && aCleanCode === mCleanCode) ||
                  (aCleanId && mCleanId && aCleanId === mCleanId) ||
                  (aName && mName && (aName === mName || aName.includes(mName) || mName.includes(aName)))
                );
              });

              const resolvedStatus = dInfo.status_label || (dInfo.code === 'P' ? 'Present' : dInfo.status || 'Present');
              const inTime = dInfo.check_in && dInfo.check_in !== '--:--' && dInfo.check_in !== '-' ? dInfo.check_in : undefined;
              const outTime = dInfo.check_out && dInfo.check_out !== '--:--' && dInfo.check_out !== '-' ? dInfo.check_out : undefined;

              if (existing) {
                if (inTime && (!existing.check_in || existing.check_in === '--:--' || existing.check_in === '—' || existing.check_in === '-')) {
                  existing.check_in = inTime;
                }
                if (outTime && (!existing.check_out || existing.check_out === '--:--' || existing.check_out === '—' || existing.check_out === '-')) {
                  existing.check_out = outTime;
                }
                if (dInfo.check_in_location && (!existing.check_in_location || existing.check_in_location === '—' || existing.check_in_location === '')) {
                  existing.check_in_location = dInfo.check_in_location;
                }
                if (dInfo.check_out_location && (!existing.check_out_location || existing.check_out_location === '—' || existing.check_out_location === '')) {
                  existing.check_out_location = dInfo.check_out_location;
                }
                if (existing.status === 'Absent' || !existing.status) {
                  existing.status = resolvedStatus;
                }
              } else {
                combinedAtt.push({
                  id: `matrix_${mEmp.id}_${targetDate}`,
                  employee_id: mEmp.id,
                  employee_code: mEmp.code || '',
                  employee_name: mEmp.name || '',
                  initials: mEmp.initials || '',
                  designation: mEmp.designation || '',
                  department: mEmp.department || '',
                  date: targetDate,
                  check_in: inTime || '--:--',
                  check_out: outTime || '--:--',
                  check_in_location: dInfo.check_in_location || '',
                  check_out_location: dInfo.check_out_location || '',
                  status: resolvedStatus,
                  work_hours: dInfo.work_hours || 8.0,
                  notes: 'Live System Attendance Record'
                });
              }
            }
          });
        }
      }
      setAttendance(combinedAtt);
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filterDate);
  }, [filterDate, selectedBranch]);

  // Load matrix whenever date range changes for Range Attendance view
  useEffect(() => {
    if (filterFromDate) {
      const parts = filterFromDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (y && m) {
        const branchIdParam = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
        hrmsApi.getAttendanceMatrix({ year: y, month: m, user_type: 'all', branch_id: branchIdParam })
          .then((res) => {
            if (res) setAttendanceMatrix(res);
          })
          .catch(() => {});
      }
    }
  }, [filterFromDate, filterToDate, selectedBranch]);

  // Dynamic institute rollup computed live from employee and student attendance records
  const dynamicDistricts = useMemo(() => {
    if (employees.length === 0 && attendance.length === 0 && students.length === 0 && allBranchesList.length === 0) {
      return [];
    }

    const distGroups = new Map<string, {
      total: number;
      registered: number;
      attended: number;
      late: number;
      early: number;
      notOut: number;
      absent: number;
      leave: number;
      od: number;
      district: string;
      branchName?: string;
      branchId?: string;
    }>();

    // Map attendance records by employee
    const attMap = new Map<string, AttendanceRecord>();
    attendance.forEach((att) => {
      if (att.employee_id) attMap.set(att.employee_id.toLowerCase(), att);
      if (att.employee_code) attMap.set(att.employee_code.toLowerCase(), att);
      if (att.employee_name) attMap.set(att.employee_name.toLowerCase(), att);
    });

    // Pre-populate distGroups with all registered organizations & branches so 0-count organizations are always displayed
    allBranchesList.forEach((b) => {
      const orgKey = b.vahd_name || b.name || b.branch_name;
      if (!orgKey || orgKey.toUpperCase() === 'VAHD') return;
      const bDist = b.district || b.city || b.branch_name || '—';
      const bBranch = b.branch_name || b.city || '—';

      // District Filter
      if (selectedDistrict !== 'All Districts') {
        const matchDist = bDist.toLowerCase() === selectedDistrict.toLowerCase() ||
          orgKey.toLowerCase().includes(selectedDistrict.toLowerCase());
        if (!matchDist) return;
      }

      // Institute Filter
      if (filterInstitute !== 'All Institutes' && filterInstitute !== 'All Districts') {
        if (orgKey.toLowerCase() !== filterInstitute.toLowerCase()) return;
      }

      // Search Filter
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase();
        const fullStr = `${orgKey} ${bDist} ${bBranch}`.toLowerCase();
        if (!fullStr.includes(q)) return;
      }

      if (!distGroups.has(orgKey)) {
        distGroups.set(orgKey, {
          total: 0,
          registered: 0,
          attended: 0,
          late: 0,
          early: 0,
          notOut: 0,
          absent: 0,
          leave: 0,
          od: 0,
          district: bBranch || bDist,
          branchName: bBranch,
          branchId: b.id,
        });
      }
    });

    if (dailyAttendeeType === 'all' || dailyAttendeeType === 'employees') {
      employees.forEach((emp) => {
        const branchObj = allBranchesList.find((b) => b.id === emp.branch_id || b.id === emp.tenant_id) ||
          (emp.organization_name ? allBranchesList.find((b) => b.vahd_name?.toLowerCase() === emp.organization_name?.toLowerCase()) : undefined);
        const dName = branchObj?.vahd_name || branchObj?.name || emp.organization_name || emp.institute_name || branchObj?.branch_name || emp.vahd_branch || '—';
        const empDist = emp.district || branchObj?.district || branchObj?.city || '—';
        const empPlace = branchObj?.branch_name || (branchObj as any)?.city || emp.vahd_branch || '—';

        // District Filter
        if (selectedDistrict !== 'All Districts') {
          const matchDist = empDist.toLowerCase() === selectedDistrict.toLowerCase() ||
            dName.toLowerCase().includes(selectedDistrict.toLowerCase());
          if (!matchDist) return;
        }

        // Institute Filter
        if (filterInstitute !== 'All Institutes' && filterInstitute !== 'All Districts') {
          if (dName.toLowerCase() !== filterInstitute.toLowerCase()) return;
        }

        // Branch Filter
        if (filterPlace !== 'All Branches' && filterPlace !== 'All Places') {
          if (empPlace.toLowerCase() !== filterPlace.toLowerCase()) return;
        }

        // Institution Type Filter
        if (filterInstType !== 'All Types') {
          const fullCheck = `${dName} ${empPlace} ${emp.vahd_branch || ''}`.toUpperCase();
          if (!fullCheck.includes(filterInstType.toUpperCase())) return;
        }

        // Search Filter
        if (searchTableQuery.trim()) {
          const q = searchTableQuery.toLowerCase();
          const fullStr = `${dName} ${empDist} ${empPlace} ${emp.first_name || ''} ${emp.last_name || ''} ${emp.code || ''}`.toLowerCase();
          if (!fullStr.includes(q)) return;
        }

        if (!distGroups.has(dName)) {
          distGroups.set(dName, {
            total: 0,
            registered: 0,
            attended: 0,
            late: 0,
            early: 0,
            notOut: 0,
            absent: 0,
            leave: 0,
            od: 0,
            district: empDist
          });
        }
        const st = distGroups.get(dName)!;
        st.total += 1;

        // Register count increments ONLY for users with face registration completed
        const isFaceReg = Boolean(
          emp.face_registered ||
          emp.avatar ||
          emp.meta_data?.face_registered ||
          emp.meta_data?.avatar ||
          emp.meta_data?.photo
        );
        if (isFaceReg) {
          st.registered += 1;
        }

        const att = attMap.get(emp.id?.toLowerCase()) || (emp.code ? attMap.get(emp.code.toLowerCase()) : undefined);
        if (att) {
          const s = (att.status || '').toLowerCase();
          if (s === 'present') {
            st.attended += 1;
          } else if (s === 'late') {
            st.attended += 1;
            st.late += 1;
          } else if (s === 'leave') {
            st.leave += 1;
          } else if (s === 'on duty' || s === 'od') {
            st.od += 1;
          } else {
            st.absent += 1;
          }

          if (att.check_in && att.check_in !== '--:--' && (!att.check_out || att.check_out === '--:--')) {
            st.notOut += 1;
          }
        } else {
          st.absent += 1;
        }
      });
    }

    // Process students when scope includes students
    if (dailyAttendeeType === 'all' || dailyAttendeeType === 'students') {
      students.forEach((s) => {
        const meta = s.meta_data || {};
        const branchObj = allBranchesList.find((b) => b.id === s.branch_id || b.id === s.tenant_id);
        const dName = branchObj?.vahd_name || branchObj?.name || (meta.organisation_name && meta.organisation_name !== 'VAHD' ? meta.organisation_name : '') || (s.institute_name && s.institute_name !== 'VAHD' ? s.institute_name : '') || (meta.college_name && meta.college_name !== 'VAHD' ? meta.college_name : '') || branchObj?.branch_name || s.primary_vahd_location || '—';
        const stuDist = s.district || meta.district || branchObj?.district || branchObj?.city || '—';
        const stuPlace = s.course || branchObj?.branch_name || s.primary_vahd_location || '—';

        if (selectedDistrict !== 'All Districts') {
          const matchDist = stuDist.toLowerCase() === selectedDistrict.toLowerCase() ||
            dName.toLowerCase().includes(selectedDistrict.toLowerCase());
          if (!matchDist) return;
        }

        if (filterInstitute !== 'All Institutes' && filterInstitute !== 'All Districts') {
          if (dName.toLowerCase() !== filterInstitute.toLowerCase()) return;
        }

        if (filterPlace !== 'All Branches' && filterPlace !== 'All Places') {
          if (stuPlace.toLowerCase() !== filterPlace.toLowerCase()) return;
        }

        if (searchTableQuery.trim()) {
          const q = searchTableQuery.toLowerCase();
          const fullStr = `${dName} ${stuDist} ${stuPlace} ${s.full_name || ''} ${s.member_code || ''}`.toLowerCase();
          if (!fullStr.includes(q)) return;
        }

        if (!distGroups.has(dName)) {
          distGroups.set(dName, {
            total: 0,
            registered: 0,
            attended: 0,
            late: 0,
            early: 0,
            notOut: 0,
            absent: 0,
            leave: 0,
            od: 0,
            district: stuDist
          });
        }
        const st = distGroups.get(dName)!;
        st.total += 1;

        // Register count increments ONLY for students with face registration completed
        const isFaceReg = Boolean(
          s.face_registered ||
          s.face_image ||
          s.profile_image ||
          meta.face_registered ||
          meta.face_image
        );
        if (isFaceReg) {
          st.registered += 1;
        }

        if (s.is_present || s.isPresentToday || s.today_status === 'Present') {
          st.attended += 1;
        } else {
          st.absent += 1;
        }
      });
    }

    return Array.from(distGroups.entries()).map(([name, stats]) => ({
      name,
      ...stats
    }));
  }, [employees, attendance, students, allBranchesList, selectedDistrict, filterInstitute, filterPlace, filterInstType, searchTableQuery, dailyAttendeeType]);

  // Built dynamic employee daily rows from live database records
  interface AttendanceRowItem {
    attendee_type: string;
    name: string;
    id: string;
    desg: string;
    place: string;
    dist: string;
    district: string;
    in: string;
    out: string;
    in_loc: string;
    out_loc: string;
    in_lat: number | null | undefined;
    in_lng: number | null | undefined;
    out_lat: number | null | undefined;
    out_lng: number | null | undefined;
    loc: string;
    status: string;
  }

  const employeeAttendanceRows: AttendanceRowItem[] = useMemo(() => {
    const attMap = new Map<string, AttendanceRecord>();
    const registerAtt = (key: string | undefined | null, record: AttendanceRecord) => {
      if (!key) return;
      const cleanKey = String(key).trim().toLowerCase();
      if (!cleanKey) return;
      const hasValidPunch = !!(record.check_in && record.check_in !== '--:--' && record.check_in !== '—');
      const existing = attMap.get(cleanKey);
      if (!existing || (hasValidPunch && (!existing.check_in || existing.check_in === '--:--' || existing.check_in === '—'))) {
        attMap.set(cleanKey, record);
      }
      if (cleanKey.startsWith('emp_')) {
        const noEmp = cleanKey.replace(/^emp_/, '');
        if (!attMap.has(noEmp)) attMap.set(noEmp, record);
      }
      if (cleanKey.startsWith('emp-')) {
        const noEmp = cleanKey.replace(/^emp-/, '');
        if (!attMap.has(noEmp)) attMap.set(noEmp, record);
      }
      const numOnly = cleanKey.replace(/\D/g, '');
      if (numOnly) {
        const padded = numOnly.padStart(4, '0');
        if (!attMap.has(padded)) attMap.set(padded, record);
        const unpadded = String(parseInt(numOnly, 10));
        if (!attMap.has(unpadded)) attMap.set(unpadded, record);
      }
    };

    attendance.forEach((att) => {
      registerAtt(att.employee_id, att);
      registerAtt(att.employee_code, att);
      registerAtt(att.employee_name, att);
      if ((att as any).email) registerAtt((att as any).email, att);
      if ((att as any).user_id) registerAtt((att as any).user_id, att);
    });

    const recordedEmpIds = new Set<string>();

    const cleanLocation = (rawLoc?: string | null): string => {
      if (!rawLoc || rawLoc === '—' || rawLoc === '--:--') return '—';
      const cleaned = rawLoc
        .replace(/\s*\((Face Scanner|Biometric Turnstile|RFID Sensor|Manual Self Check-in|GPS Mobile|Face AI Terminal|Webcam|WEBCAM_FACE_SCANNER)\)/gi, '')
        .replace(/^(Face Scanner|Biometric Device|Biometric Turnstile|Live Face Scanner|Webcam)$/i, '')
        .trim();
      return cleaned || '—';
    };

    const rowsFromEmployees = employees.map((emp, idx) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.full_name || 'Staff Member';
      const empId = emp.code || emp.id || `EMP-${1000 + idx}`;

      const lookupKeys = [
        emp.id,
        emp.code,
        emp.code ? emp.code.replace(/^EMP-/i, '') : '',
        emp.code ? String(parseInt(emp.code.replace(/\D/g, '') || '0', 10)) : '',
        emp.code ? (emp.code.replace(/\D/g, '') || '').padStart(4, '0') : '',
        emp.id ? emp.id.replace(/^emp_/i, '') : '',
        fullName,
        emp.first_name,
        emp.email,
        (emp as any).user_id,
      ].filter(Boolean) as string[];

      let att: AttendanceRecord | undefined;
      for (const k of lookupKeys) {
        const cleanK = String(k).trim().toLowerCase();
        if (attMap.has(cleanK)) {
          att = attMap.get(cleanK);
          break;
        }
      }

      if (emp.id) recordedEmpIds.add(emp.id.toLowerCase());
      if (emp.code) recordedEmpIds.add(emp.code.toLowerCase());
      if (empId) recordedEmpIds.add(empId.toLowerCase());
      if (fullName) recordedEmpIds.add(fullName.toLowerCase());

      const inTime = att?.check_in && att.check_in !== '--:--' && att.check_in !== '-' ? att.check_in : '—';
      const outTime = att?.check_out && att.check_out !== '--:--' && att.check_out !== '-' ? att.check_out : '—';
      const hasInPunch = inTime !== '—';
      const hasOutPunch = outTime !== '—';

      let status = 'Absent';
      if (att?.status) {
        status = att.status;
      } else if (hasInPunch) {
        status = 'Present';
      } else if (emp.status && emp.status.toLowerCase() !== 'active') {
        status = emp.status;
      }

      const branchObj = allBranchesList.find((b) => b.id === emp.branch_id || b.id === emp.tenant_id) ||
        (emp.organization_name ? allBranchesList.find((b) => b.vahd_name?.toLowerCase() === emp.organization_name?.toLowerCase()) : undefined);
      const branchName = branchObj?.branch_name || (branchObj as any)?.city || emp.vahd_branch || emp.branch_name || '—';
      const dist = branchObj?.vahd_name || branchObj?.name || (emp.organization_name && emp.organization_name !== 'VAHD' ? emp.organization_name : '') || (emp.institute_name && emp.institute_name !== 'VAHD' ? emp.institute_name : '') || branchObj?.branch_name || emp.vahd_branch || '—';
      const empDist = emp.district || branchObj?.district || branchObj?.city || '—';

      // Dynamic check-in location from DB (strictly '—' if user has not checked in)
      let inLoc = '—';
      if (hasInPunch) {
        const cleaned = cleanLocation(att?.check_in_location);
        if (cleaned !== '—') {
          inLoc = cleaned;
        } else if (att?.check_in_latitude && att?.check_in_longitude) {
          inLoc = `${Number(att.check_in_latitude).toFixed(4)}, ${Number(att.check_in_longitude).toFixed(4)}`;
        } else if (emp.vahd_branch) {
          inLoc = emp.vahd_branch;
        }
      }

      // Dynamic check-out location from DB (strictly '—' if user has not checked out)
      let outLoc = '—';
      if (hasOutPunch) {
        const cleaned = cleanLocation(att?.check_out_location);
        if (cleaned !== '—') {
          outLoc = cleaned;
        } else if (att?.check_out_latitude && att?.check_out_longitude) {
          outLoc = `${Number(att.check_out_latitude).toFixed(4)}, ${Number(att.check_out_longitude).toFixed(4)}`;
        } else if (emp.vahd_branch) {
          outLoc = emp.vahd_branch;
        }
      }

      return {
        attendee_type: 'employee',
        name: fullName,
        id: empId,
        desg: emp.designation || '—',
        place: branchName,
        dist: dist,
        district: empDist,
        in: inTime,
        out: outTime,
        in_loc: inLoc,
        out_loc: outLoc,
        in_lat: att?.check_in_latitude,
        in_lng: att?.check_in_longitude,
        out_lat: att?.check_out_latitude,
        out_lng: att?.check_out_longitude,
        loc: inLoc,
        status: status
      };
    });

    const rowsFromStudents = students.map((s, idx) => {
      const fullName = s.full_name || s.name || 'Student';
      const studentRoll = s.member_code || s.roll_number || s.student_number || s.code || (s.id && !s.id.startsWith('cust_') ? s.id : `stu${String(idx + 1).padStart(4, '0')}`);

      const lookupKeys = [
        s.id,
        s.user_id,
        s.member_code,
        s.roll_number,
        s.student_number,
        s.code,
        studentRoll,
        fullName,
        s.email,
        s.phone,
      ].filter(Boolean) as string[];

      let att: AttendanceRecord | undefined;
      for (const k of lookupKeys) {
        const cleanK = String(k).trim().toLowerCase();
        if (attMap.has(cleanK)) {
          att = attMap.get(cleanK);
          break;
        }
      }

      if (s.id) recordedEmpIds.add(s.id.toLowerCase());
      if (s.user_id) recordedEmpIds.add(String(s.user_id).toLowerCase());
      if (s.member_code) recordedEmpIds.add(String(s.member_code).toLowerCase());
      if (studentRoll) recordedEmpIds.add(studentRoll.toLowerCase());
      if (fullName) recordedEmpIds.add(fullName.toLowerCase());

      const inTime = att?.check_in && att.check_in !== '--:--' && att.check_in !== '-'
        ? att.check_in
        : (s.today_punch?.in_time || s.punch_in || s.in_time || '—');
      const outTime = att?.check_out && att.check_out !== '--:--' && att.check_out !== '-'
        ? att.check_out
        : (s.today_punch?.out_time || s.punch_out || s.out_time || '—');
      const hasInPunch = inTime !== '—';
      const hasOutPunch = outTime !== '—';

      let status = 'Absent';
      if (att?.status) {
        status = att.status;
      } else if (hasInPunch) {
        status = 'Present';
      } else if (s.today_status && s.today_status !== 'Absent') {
        status = s.today_status;
      } else if (s.is_present || s.isPresentToday) {
        status = 'Present';
      } else if (s.status && s.status.toLowerCase() !== 'active') {
        status = s.status;
      }

      const meta = s.meta_data || {};
      const branchObj = allBranchesList.find((b) => b.id === s.branch_id || b.id === s.tenant_id) ||
        (s.primary_vahd_location ? allBranchesList.find((b) => b.vahd_name && s.primary_vahd_location.toLowerCase().includes(b.vahd_name.toLowerCase())) : undefined);
      const branchName = branchObj?.branch_name || (branchObj as any)?.city || (s.primary_vahd_location && s.primary_vahd_location.includes(' - ') ? s.primary_vahd_location.split(' - ')[1].trim() : s.primary_vahd_location) || s.branch_name || '—';
      const dist = branchObj?.vahd_name || branchObj?.name || (meta.organisation_name && meta.organisation_name !== 'VAHD' ? meta.organisation_name : '') || (s.institute_name && s.institute_name !== 'VAHD' ? s.institute_name : '') || (meta.college_name && meta.college_name !== 'VAHD' ? meta.college_name : '') || branchObj?.branch_name || s.primary_vahd_location || '—';
      const stuDist = s.district || meta.district || branchObj?.district || branchObj?.city || '—';

      let inLoc = '—';
      if (hasInPunch) {
        const cleaned = cleanLocation(att?.check_in_location);
        if (cleaned !== '—') {
          inLoc = cleaned;
        } else if (att?.check_in_latitude && att?.check_in_longitude) {
          inLoc = `${Number(att.check_in_latitude).toFixed(4)}, ${Number(att.check_in_longitude).toFixed(4)}`;
        } else if (s.primary_vahd_location) {
          inLoc = s.primary_vahd_location;
        }
      }

      let outLoc = '—';
      if (hasOutPunch) {
        const cleaned = cleanLocation(att?.check_out_location);
        if (cleaned !== '—') {
          outLoc = cleaned;
        } else if (att?.check_out_latitude && att?.check_out_longitude) {
          outLoc = `${Number(att.check_out_latitude).toFixed(4)}, ${Number(att.check_out_longitude).toFixed(4)}`;
        } else if (s.primary_vahd_location) {
          outLoc = s.primary_vahd_location;
        }
      }

      return {
        attendee_type: 'student',
        name: fullName,
        id: studentRoll,
        desg: s.course || s.specialization || s.qualification || 'Student',
        place: branchName,
        dist: dist,
        district: stuDist,
        in: inTime,
        out: outTime,
        in_loc: inLoc,
        out_loc: outLoc,
        in_lat: att?.check_in_latitude,
        in_lng: att?.check_in_longitude,
        out_lat: att?.check_out_latitude,
        out_lng: att?.check_out_longitude,
        loc: inLoc,
        status: status
      };
    });

    // Also include attendance records that don't match any employee directly
    const extraRows = attendance
      .filter((att) => {
        const id1 = (att.employee_id || '').toLowerCase();
        const code1 = (att.employee_code || '').toLowerCase();
        const name1 = (att.employee_name || '').toLowerCase();
        return !recordedEmpIds.has(id1) && !recordedEmpIds.has(code1) && !recordedEmpIds.has(name1);
      })
      .map((att, idx) => {
        const inTime = att.check_in && att.check_in !== '--:--' && att.check_in !== '-' ? att.check_in : '—';
        const outTime = att.check_out && att.check_out !== '--:--' && att.check_out !== '-' ? att.check_out : '—';
        const hasInPunch = inTime !== '—';
        const hasOutPunch = outTime !== '—';

        let inLoc = '—';
        if (hasInPunch) {
          const cleaned = cleanLocation(att.check_in_location);
          if (cleaned !== '—') {
            inLoc = cleaned;
          } else if (att.check_in_latitude && att.check_in_longitude) {
            inLoc = `${Number(att.check_in_latitude).toFixed(4)}, ${Number(att.check_in_longitude).toFixed(4)}`;
          }
        }

        let outLoc = '—';
        if (hasOutPunch) {
          const cleaned = cleanLocation(att.check_out_location);
          if (cleaned !== '—') {
            outLoc = cleaned;
          } else if (att.check_out_latitude && att.check_out_longitude) {
            outLoc = `${Number(att.check_out_latitude).toFixed(4)}, ${Number(att.check_out_longitude).toFixed(4)}`;
          }
        }

        const defaultPlace = (att as any).branch_name || (att as any).city || att.department || '—';
        const extraDist = (att as any).vahd_name || ((att as any).institute_name && (att as any).institute_name !== 'VAHD' ? (att as any).institute_name : '') || (att as any).branch_name || '—';
        const extraDistrict = (att as any).district || (att as any).city || '—';

        return {
          attendee_type: 'employee',
          name: att.employee_name || att.employee_code || att.employee_id || `STAFF-${idx + 1}`,
          id: att.employee_code || att.employee_id || `STAFF-${idx + 1}`,
          desg: att.designation || '—',
          place: defaultPlace,
          dist: extraDist,
          district: extraDistrict,
          in: inTime,
          out: outTime,
          in_loc: inLoc,
          out_loc: outLoc,
          in_lat: att.check_in_latitude,
          in_lng: att.check_in_longitude,
          out_lat: att.check_out_latitude,
          out_lng: att.check_out_longitude,
          loc: inLoc,
          status: att.status || (hasInPunch ? 'Present' : 'Absent')
        };
      });

    if (dailyAttendeeType === 'employees') {
      return [...rowsFromEmployees, ...extraRows];
    } else if (dailyAttendeeType === 'students') {
      return rowsFromStudents;
    } else {
      return [...rowsFromEmployees, ...rowsFromStudents, ...extraRows];
    }
  }, [employees, attendance, students, dailyAttendeeType]);

  // Dynamic district filter list (from live records, branches, and official districts)
  const availableDistrictsList = useMemo(() => {
    const fromRecords = employeeAttendanceRows
      .map((r) => r.district)
      .filter((d): d is string => !!d && d !== '—' && d.trim() !== '');
    const fromBranches = allBranchesList
      .map((b) => b.district || b.city)
      .filter((d): d is string => !!d && d !== '—' && d.trim() !== '');
    const combined = Array.from(new Set([...fromRecords, ...fromBranches, ...DISTRICTS.slice(1)]));
    return ['All Districts', ...combined];
  }, [employeeAttendanceRows, allBranchesList]);

  // Dynamic institute filter list (narrowed by selectedDistrict if set)
  const availableInstitutesList = useMemo(() => {
    let rows = employeeAttendanceRows;
    if (selectedDistrict !== 'All Districts') {
      rows = rows.filter((r) =>
        (r.district && r.district.toLowerCase() === selectedDistrict.toLowerCase()) ||
        (r.dist && r.dist.toLowerCase().includes(selectedDistrict.toLowerCase()))
      );
    }
    const fromRows = rows.map((r) => r.dist).filter((d) => d && d !== '—');
    const fromBranches = allBranchesList
      .filter((b) => {
        if (selectedDistrict === 'All Districts') return true;
        const bDist = b.district || b.city || '';
        const bName = b.vahd_name || b.name || b.branch_name;
        return (
          bDist.toLowerCase() === selectedDistrict.toLowerCase() ||
          bName.toLowerCase().includes(selectedDistrict.toLowerCase())
        );
      })
      .map((b) => b.vahd_name || b.name || b.branch_name)
      .filter((d): d is string => !!d && d.trim() !== '');

    const list = Array.from(new Set([...fromRows, ...fromBranches]));
    return ['All Institutes', ...list];
  }, [employeeAttendanceRows, allBranchesList, selectedDistrict]);

  const dynamicDistrictsList = availableInstitutesList;

  const dynamicPlacesList = useMemo(() => {
    let rows = employeeAttendanceRows;
    if (selectedDistrict !== 'All Districts') {
      rows = rows.filter((r) =>
        (r.district && r.district.toLowerCase() === selectedDistrict.toLowerCase()) ||
        (r.dist && r.dist.toLowerCase().includes(selectedDistrict.toLowerCase()))
      );
    }
    if (filterInstitute !== 'All Institutes') {
      rows = rows.filter((r) => r.dist.toLowerCase() === filterInstitute.toLowerCase());
    }
    const list = Array.from(new Set(rows.map((r) => r.place).filter((p) => p && p !== '—')));
    return ['All Branches', ...list];
  }, [employeeAttendanceRows, selectedDistrict, filterInstitute]);

  // Filtered rows for Daily Attendance Report
  const filteredDailyAttendance = useMemo(() => {
    return employeeAttendanceRows.filter((r) => {
      const matchDistrict =
        selectedDistrict === 'All Districts' ||
        (r.district && r.district.toLowerCase() === selectedDistrict.toLowerCase()) ||
        (r.dist && r.dist.toLowerCase().includes(selectedDistrict.toLowerCase()));
      const matchInst =
        filterInstitute === 'All Institutes' ||
        filterInstitute === 'All Districts' ||
        r.dist.toLowerCase() === filterInstitute.toLowerCase();
      const matchPlace = filterPlace === 'All Branches' || filterPlace === 'All Places' || r.place.toLowerCase() === filterPlace.toLowerCase();
      const st = (r.status || '').toLowerCase();
      const fst = (filterStatus || '').toLowerCase();
      const matchStatus =
        filterStatus === 'All' ||
        st === fst ||
        (fst === 'present' && (st.startsWith('present') || st === 'late' || st === 'p')) ||
        (fst === 'late' && (st === 'late' || st.includes('late'))) ||
        (fst === 'absent' && (st === 'absent' || st === 'a')) ||
        (fst === 'leave' && (st.includes('leave') || st === 'pl'));
      const matchQuery =
        !searchTableQuery.trim() ||
        r.name.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.desg.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.dist.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (r.district && r.district.toLowerCase().includes(searchTableQuery.toLowerCase())) ||
        r.place.toLowerCase().includes(searchTableQuery.toLowerCase());

      const matchCheckin = !filterCheckinTime || (r.in !== '—' && r.in.includes(filterCheckinTime));
      const matchCheckout = !filterCheckoutTime || (r.out !== '—' && r.out.includes(filterCheckoutTime));

      return matchDistrict && matchInst && matchPlace && matchStatus && matchQuery && matchCheckin && matchCheckout;
    });
  }, [employeeAttendanceRows, selectedDistrict, filterInstitute, filterPlace, filterStatus, searchTableQuery, filterCheckinTime, filterCheckoutTime]);

  // Export to CSV helper with UTF-8 BOM so Microsoft Excel opens it cleanly with full columns and data
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
    const escapeCell = (cell: string | number | undefined | null) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent =
      '\uFEFF' +
      [
        headers.map(escapeCell).join(','),
        ...rows.map((row) => row.map(escapeCell).join(','))
      ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  const authToken = typeof window !== 'undefined' ? (localStorage.getItem('vahd_token') || localStorage.getItem('token') || '') : '';
  const authParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DRILL-DOWN SUBVIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. STUDENT ATTENDANCE REPORT & DOWNLOAD CENTER
  const renderStudentAttendanceView = () => {
    const studentsList = studentsOverview?.students || [];
    const filteredStudents = studentsList.filter((s: any) => {
      const matchBranch = !selectedBranch || selectedBranch === 'all' ||
        s.branch_id === selectedBranch ||
        allBranchesList.some((b) => b.id === selectedBranch && (b.id === s.branch_id || (b.vahd_name && b.vahd_name === s.branch_name)));
      const matchSearch =
        !searchTableQuery.trim() ||
        (s.student_name || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (s.roll_number || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (s.degree || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (s.branch_name || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (s.parent_phone || '').includes(searchTableQuery);

      const pct = s.attendance_percentage ?? 0;
      let matchStatus = true;
      if (studentStatusFilter === 'eligible') matchStatus = pct >= 75;
      else if (studentStatusFilter === 'borderline') matchStatus = pct >= 60 && pct < 75;
      else if (studentStatusFilter === 'shortage') matchStatus = pct < 60;

      return matchBranch && matchSearch && matchStatus;
    });

    const displayTotalStudents = filteredStudents.length;
    const displayAvgPct = filteredStudents.length
      ? Math.round(filteredStudents.reduce((acc: number, s: any) => acc + (s.attendance_percentage || 0), 0) / filteredStudents.length)
      : 0;
    const displayEligible = filteredStudents.filter((s: any) => (s.attendance_percentage || 0) >= 75).length;
    const displayShortage = filteredStudents.filter((s: any) => (s.attendance_percentage || 0) < 60).length;
    const displayWorkingDays = filteredStudents[0]?.total_working_days || studentsOverview?.total_working_days || 0;
    const branchDownloadParam = selectedBranch && selectedBranch !== 'all' ? `&branch_id=${encodeURIComponent(selectedBranch)}` : '';

    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Home
          </button>
          <span className="text-slate-400">›</span>
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Reports
          </button>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-bold">Students Attendance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="graduation-cap" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Student Attendance Report &amp; Download Center
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                STUDENTS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official monthly student biometric attendance records, course performance, and downloadable statements
            </p>
          </div>
        </div>

        {/* Filter Toolbar Box */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch / Organisation</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBranch(val);
                    localStorage.setItem('vahd_selected_org_id', val);
                    window.dispatchEvent(new CustomEvent('vahd:org_changed', { detail: { id: val } }));
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 max-w-[210px]"
                >
                  <option value="all">🌟 All Branches (Consolidated)</option>
                  {allBranchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏫 {b.vahd_name ? `${b.vahd_name} — ` : ''}{b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Month</label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendance Standing</label>
                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Standings</option>
                  <option value="eligible">Eligible (≥ 75%)</option>
                  <option value="borderline">Borderline (60% - 74%)</option>
                  <option value="shortage">Shortage / Risk (&lt; 60%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Student</label>
                <input
                  type="text"
                  placeholder="Roll, Name, Campus..."
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 w-44"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <a
                href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&category=students${branchDownloadParam}${authParam}`}
                download
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                title="Download consolidated Excel file for students"
              >
                <Icon name="file-spreadsheet" size={14} />
                <span>{selectedBranch !== 'all' ? 'Download Branch Excel' : 'Download All Students Excel'}</span>
              </a>

              <a
                href={`/api/v1/ho/attendance-reports/export/pdf?year=${targetYear}&month=${targetMonth}&category=students${branchDownloadParam}${authParam}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                title="Open executive printable PDF statement"
              >
                <Icon name="printer" size={14} />
                <span>{selectedBranch !== 'all' ? 'Download Branch PDF' : 'Download All Students PDF'}</span>
              </a>

              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    `Student_Attendance_${targetYear}_${targetMonth}`,
                    ['#', 'INSTITUTE NAME', 'ROLL NO', 'STUDENT NAME', 'DEGREE / COURSE', 'REGISTERED MOBILE', 'WORKING DAYS', 'PRESENT', 'ABSENT', 'ATTENDANCE %'],
                    filteredStudents.map((s: any, idx: number) => {
                      const sBranch = allBranchesList.find((b: any) => b.id === s.branch_id || b.id === s.tenant_id);
                      const sOrg = (sBranch as any)?.vahd_name || (sBranch as any)?.name || (s.organisation_name && s.organisation_name !== 'VAHD' ? s.organisation_name : '') || (s.vahd_name && s.vahd_name !== 'VAHD' ? s.vahd_name : '') || (s.college_name && s.college_name !== 'VAHD' ? s.college_name : '') || (s.institute_name && s.institute_name !== 'VAHD' ? s.institute_name : '') || sBranch?.branch_name || s.branch_name || '—';
                      return [
                        idx + 1,
                        sOrg,
                        s.roll_number || s.member_code || s.student_number || s.code || (s.student_id?.startsWith('cust_') ? `stu${s.student_id.slice(-4)}` : s.student_id),
                        s.student_name,
                        s.degree || '--',
                        s.parent_phone || '--',
                        s.total_working_days,
                        s.days_present,
                        s.days_absent,
                        `${s.attendance_percentage}%`
                      ];
                    })
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-white via-white to-blue-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Students</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">{displayTotalStudents}</span>
              <span className="text-[11px] font-medium text-slate-400">Enrolled roster</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon name="graduation-cap" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-blue-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-slate-50/50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Working Days</span>
              <span className="text-2xl font-black text-slate-800 mt-0.5 block">{displayWorkingDays}</span>
              <span className="text-[11px] font-medium text-slate-400">Total in month</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
              <Icon name="calendar" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-slate-200/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Avg Attendance</span>
              <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{displayAvgPct}%</span>
              <span className="text-[11px] font-medium text-emerald-600/80">Check-in score</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Icon name="trending-up" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-emerald-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Eligible (≥ 75%)</span>
              <span className="text-2xl font-black text-indigo-600 mt-0.5 block">{displayEligible}</span>
              <span className="text-[11px] font-medium text-indigo-600/80">Hall ticket cleared</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Icon name="check-circle" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-indigo-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-rose-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Shortage (&lt; 60%)</span>
              <span className="text-2xl font-black text-rose-600 mt-0.5 block">{displayShortage}</span>
              <span className="text-[11px] font-medium text-rose-600/80">Condonation list</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <Icon name="alert-circle" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-rose-100/50 blur-xl pointer-events-none" />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Student Attendance Statements</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {filteredStudents.length} Students
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Period: <strong>{studentsOverview?.month_name || 'Selected Month'} {studentsOverview?.year || targetYear}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Roll / ID</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Degree / Program</th>
                  <th className="py-2.5 px-3">Registered Mobile</th>
                  <th className="py-2.5 px-3 text-center">Working</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3">Organisation</th>
                  <th className="py-2.5 px-3 text-right">Statements &amp; Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingMonthly ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                      Loading student attendance records...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                      No students found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s: any) => {
                    const pct = s.attendance_percentage ?? 0;
                    const studentBranch = allBranchesList.find((b: any) => b.id === s.branch_id || b.id === s.tenant_id);
                    const orgName = (studentBranch as any)?.vahd_name || (studentBranch as any)?.name || (s.organisation_name && s.organisation_name !== 'VAHD' ? s.organisation_name : '') || (s.vahd_name && s.vahd_name !== 'VAHD' ? s.vahd_name : '') || (s.college_name && s.college_name !== 'VAHD' ? s.college_name : '') || (s.institute_name && s.institute_name !== 'VAHD' ? s.institute_name : '') || studentBranch?.branch_name || s.branch_name || '—';
                    const branchCity = studentBranch?.branch_name || (studentBranch as any)?.city || s.branch_name || '';

                    return (
                      <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{s.roll_number || s.member_code || s.student_number || s.code || (s.student_id?.startsWith('cust_') ? `stu${s.student_id.slice(-4)}` : s.student_id)}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          <div>{s.student_name}</div>
                          {branchCity ? (
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                🏫 {branchCity}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{s.degree || '--'}</td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{s.parent_phone || '--'}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{s.total_working_days}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{s.days_present}</td>
                        <td className="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30">{s.days_absent}</td>
                        <td className="py-3 px-3 text-[11px] font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 text-[10px]">
                              🏛️
                            </span>
                            <span className="truncate max-w-[200px]" title={orgName}>
                              {orgName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/api/v1/students/${s.student_id}/attendance-report/csv?year=${targetYear}&month=${targetMonth}${authParam}`}
                              download
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                              title="Download Student CSV Statement"
                            >
                              <Icon name="download" size={12} />
                              <span>CSV</span>
                            </a>
                            <a
                              href={`/api/v1/students/${s.student_id}/attendance-report/pdf?year=${targetYear}&month=${targetMonth}${authParam}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition"
                              title="Print Official PDF Statement"
                            >
                              <Icon name="printer" size={12} />
                              <span>PDF</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. EMPLOYEE ATTENDANCE REPORT & DOWNLOAD CENTER
  const renderEmployeeAttendanceView = () => {
    const employeesList = employeesOverview?.employees || [];
    const filteredEmployees = employeesList.filter((emp: any) => {
      const matchBranch = !selectedBranch || selectedBranch === 'all' ||
        emp.branch_id === selectedBranch ||
        allBranchesList.some((b) => b.id === selectedBranch && (b.id === emp.branch_id || (b.vahd_name && b.vahd_name === emp.branch_name)));
      const matchSearch =
        !searchTableQuery.trim() ||
        (emp.employee_name || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (emp.employee_code || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (emp.designation || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (emp.department || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (emp.branch_name || '').toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        (emp.email || '').toLowerCase().includes(searchTableQuery.toLowerCase());

      const pct = emp.attendance_percentage ?? 0;
      let matchStatus = true;
      if (employeeStatusFilter === 'eligible') matchStatus = pct >= 75;
      else if (employeeStatusFilter === 'borderline') matchStatus = pct >= 60 && pct < 75;
      else if (employeeStatusFilter === 'shortage') matchStatus = pct < 60;

      return matchBranch && matchSearch && matchStatus;
    });

    const displayTotalEmployees = filteredEmployees.length;
    const displayEmpAvgPct = filteredEmployees.length
      ? Math.round(filteredEmployees.reduce((acc: number, e: any) => acc + (e.attendance_percentage || 0), 0) / filteredEmployees.length)
      : 0;
    const displayEmpOptimal = filteredEmployees.filter((e: any) => (e.attendance_percentage || 0) >= 75).length;
    const displayEmpShortage = filteredEmployees.filter((e: any) => (e.attendance_percentage || 0) < 60).length;
    const displayEmpWorkingDays = filteredEmployees[0]?.total_working_days || employeesOverview?.total_working_days || 0;
    const branchDownloadParam = selectedBranch && selectedBranch !== 'all' ? `&branch_id=${encodeURIComponent(selectedBranch)}` : '';

    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Home
          </button>
          <span className="text-slate-400">›</span>
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Reports
          </button>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-bold">Employees Attendance</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="user-check" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Employee Attendance Report &amp; Download Center
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                EMPLOYEES
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official staff attendance statements, biometric hours breakdown, and executive reports
            </p>
          </div>
        </div>

        {/* Filter Toolbar Box */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch / Organisation</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBranch(val);
                    localStorage.setItem('vahd_selected_org_id', val);
                    window.dispatchEvent(new CustomEvent('vahd:org_changed', { detail: { id: val } }));
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 max-w-[210px]"
                >
                  <option value="all">🌟 All Branches (Consolidated)</option>
                  {allBranchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      🏫 {b.vahd_name ? `${b.vahd_name} — ` : ''}{b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Month</label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Year</label>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Performance Bracket</label>
                <select
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">All Brackets</option>
                  <option value="eligible">Optimal (≥ 75%)</option>
                  <option value="borderline">Moderate (60% - 74%)</option>
                  <option value="shortage">Low Attendance (&lt; 60%)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Staff</label>
                <input
                  type="text"
                  placeholder="Code, Name, Campus..."
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 w-44"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <a
                href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&category=employees${branchDownloadParam}${authParam}`}
                download
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                title="Download consolidated Excel file for employees"
              >
                <Icon name="file-spreadsheet" size={14} />
                <span>{selectedBranch !== 'all' ? 'Download Branch Excel' : 'Download All Staff Excel'}</span>
              </a>

              <a
                href={`/api/v1/ho/attendance-reports/export/pdf?year=${targetYear}&month=${targetMonth}&category=employees${branchDownloadParam}${authParam}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                title="Open executive printable PDF statement"
              >
                <Icon name="printer" size={14} />
                <span>{selectedBranch !== 'all' ? 'Download Branch PDF' : 'Download All Staff PDF'}</span>
              </a>

              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    `Employee_Attendance_${targetYear}_${targetMonth}`,
                    ['#', 'INSTITUTE / ORGANISATION', 'EMP CODE', 'EMPLOYEE NAME', 'DESIGNATION', 'DEPARTMENT', 'EMAIL', 'MOBILE', 'WORKING DAYS', 'PRESENT', 'ABSENT', 'LEAVES', 'ATTENDANCE %', 'STATUS'],
                    filteredEmployees.map((emp: any, idx: number) => {
                      const pct = emp.attendance_percentage ?? 0;
                      const status = pct >= 75 ? 'Optimal' : pct >= 60 ? 'Moderate' : 'Low Attendance';
                      return [
                        idx + 1,
                        emp.institute_name || emp.organization_name || emp.vahd_name || emp.branch_name || emp.vahd_branch || '--',
                        emp.employee_code,
                        emp.employee_name,
                        emp.designation || '--',
                        emp.department || '--',
                        emp.email || '--',
                        emp.phone || '--',
                        emp.total_working_days,
                        emp.days_present,
                        emp.days_absent,
                        emp.days_leave,
                        `${pct}%`,
                        status
                      ];
                    })
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-white via-white to-blue-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Employees</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">{displayTotalEmployees}</span>
              <span className="text-[11px] font-medium text-slate-400">Registered staff</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon name="users" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-blue-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-slate-50/50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Working Days</span>
              <span className="text-2xl font-black text-slate-800 mt-0.5 block">{displayEmpWorkingDays}</span>
              <span className="text-[11px] font-medium text-slate-400">Total in month</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center shrink-0">
              <Icon name="calendar" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-slate-200/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Avg Attendance</span>
              <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{displayEmpAvgPct}%</span>
              <span className="text-[11px] font-medium text-emerald-600/80">Compliance rate</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Icon name="trending-up" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-emerald-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Optimal (≥ 75%)</span>
              <span className="text-2xl font-black text-indigo-600 mt-0.5 block">{displayEmpOptimal}</span>
              <span className="text-[11px] font-medium text-indigo-600/80">Full month tier</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Icon name="check-circle" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-indigo-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-purple-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Low Attendance (&lt; 60%)</span>
              <span className="text-2xl font-black text-purple-600 mt-0.5 block">{displayEmpShortage}</span>
              <span className="text-[11px] font-medium text-purple-600/80">HR review needed</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Icon name="alert-circle" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-purple-100/50 blur-xl pointer-events-none" />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Employee Attendance Statements</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                {filteredEmployees.length} Staff
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Period: <strong>{employeesOverview?.month_name || 'Selected Month'} {employeesOverview?.year || targetYear}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Emp Code</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Organisation</th>
                  <th className="py-2.5 px-3">Designation &amp; Dept</th>
                  <th className="py-2.5 px-3">Email &amp; Mobile</th>
                  <th className="py-2.5 px-3 text-center">Working</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Absent</th>
                  <th className="py-2.5 px-3 text-center">Leaves</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Statements &amp; Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingMonthly ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold">
                      Loading employee attendance records...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold">
                      No employees found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp: any) => {
                    const pct = emp.attendance_percentage ?? 0;
                    const empBranch = allBranchesList.find((b: any) => b.id === emp.branch_id || b.id === emp.tenant_id);
                    const orgName = (empBranch as any)?.vahd_name || (empBranch as any)?.name || (emp.organization_name && emp.organization_name !== 'VAHD' ? emp.organization_name : '') || (emp.institute_name && emp.institute_name !== 'VAHD' ? emp.institute_name : '') || empBranch?.branch_name || emp.branch_name || '—';
                    const branchCity = empBranch?.branch_name || (empBranch as any)?.city || emp.branch_name || emp.vahd_branch || '';

                    return (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{emp.employee_code}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-900">
                          <div>{emp.employee_name}</div>
                          {branchCity ? (
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                🏫 {branchCity}
                              </span>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 text-[11px] font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 text-[10px]">
                              🏛️
                            </span>
                            <span className="truncate max-w-[190px]" title={orgName}>
                              {orgName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-semibold text-slate-800">{emp.designation}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{emp.department}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-indigo-600 font-medium truncate max-w-[160px]">{emp.email}</div>
                          <div className="text-[10px] text-slate-500 font-mono font-semibold">{emp.phone}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">{emp.total_working_days}</td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30">{emp.days_present}</td>
                        <td className="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30">{emp.days_absent}</td>
                        <td className="py-3 px-3 text-center font-bold text-purple-600">{emp.days_leave}</td>
                        <td className="py-3 px-3 text-center">
                          {pct >= 75 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Optimal
                            </span>
                          ) : pct >= 60 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚠ Moderate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ✗ Low Attendance
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <a
                              href={`/api/v1/hrms/${emp.employee_id}/attendance-report/csv?year=${targetYear}&month=${targetMonth}${authParam}`}
                              download
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                              title="Download Employee CSV Statement"
                            >
                              <Icon name="download" size={12} />
                              <span>CSV</span>
                            </a>
                            <a
                              href={`/api/v1/hrms/${emp.employee_id}/attendance-report/pdf?year=${targetYear}&month=${targetMonth}${authParam}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition"
                              title="Print Official PDF Statement"
                            >
                              <Icon name="printer" size={12} />
                              <span>PDF</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. MULTI-BRANCH CONSOLIDATED REPORT
  const renderBranchConsolidatedView = () => {
    const branches = branchReportsData?.branches || [];

    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Home
          </button>
          <span className="text-slate-400">›</span>
          <button
            type="button"
            onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            Reports
          </button>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-bold">Multi-Branch Consolidated</span>
        </div>

        {/* Unified Top Bar Card: Header, Inline Filters & Master Download Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Branding & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="building-2" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Multi-Branch Consolidated Attendance Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                  MULTI-BRANCH
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Consolidated Head Office attendance overview and exports across all registered campus branches
              </p>
            </div>
          </div>

          {/* Right: Inline Filters & Master Download Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50/90 px-3 py-1.5 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</span>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Year</span>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <a
              href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&category=all${authParam}`}
              download
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            >
              <Icon name="file-spreadsheet" size={14} />
              <span>Download Master Consolidated Excel</span>
            </a>

            <a
              href={`/api/v1/ho/attendance-reports/export/pdf?year=${targetYear}&month=${targetMonth}&category=all${authParam}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition cursor-pointer"
            >
              <Icon name="printer" size={14} />
              <span>Download Master Consolidated PDF</span>
            </a>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-white via-white to-purple-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">Branches in Scope</span>
              <span className="text-2xl font-black text-slate-900 mt-0.5 block">{branchReportsData?.total_branches ?? 0}</span>
              <span className="text-[11px] font-medium text-slate-400">Operational campuses</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Icon name="building-2" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-purple-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Staff</span>
              <span className="text-2xl font-black text-emerald-600 mt-0.5 block">{branchReportsData?.total_employees ?? 0}</span>
              <span className="text-[11px] font-medium text-emerald-600/80">Across all institutions</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <Icon name="users" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-emerald-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-blue-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Students</span>
              <span className="text-2xl font-black text-blue-600 mt-0.5 block">{branchReportsData?.total_students ?? 0}</span>
              <span className="text-[11px] font-medium text-blue-600/80">Active enrollment</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Icon name="graduation-cap" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-blue-100/50 blur-xl pointer-events-none" />
          </div>

          <div className="bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Reporting Period</span>
              <span className="text-xl font-black text-indigo-700 mt-0.5 block">{branchReportsData?.period || 'Selected Month'}</span>
              <span className="text-[11px] font-medium text-indigo-600/80">Active fiscal cycle</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <Icon name="calendar" size={18} />
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-indigo-100/50 blur-xl pointer-events-none" />
          </div>
        </div>

        {/* Branch Cards */}
        <div className="space-y-4">
          {branches.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/90 text-center text-slate-400 font-semibold">
              No branch records available for this reporting period.
            </div>
          ) : (
            branches.map((b: any) => (
              <div key={b.branch_id} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{b.vahd_name || b.branch_name}</h3>
                    <p className="text-xs text-slate-500">
                      City: <strong>{b.city || 'Primary Campus'}</strong> &bull; Owner: <strong>{b.owner_name || 'Assigned'}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                      Staff: {b.employees?.length ?? b.employees?.total_count ?? 0} ({b.employees?.avg_attendance_percentage || 0}%)
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                      Students: {b.students?.length ?? b.students?.total_count ?? 0} ({b.students?.avg_attendance_percentage || 0}%)
                    </span>
                    <a
                      href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&branch_id=${b.branch_id}&category=students${authParam}`}
                      download
                      className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      title="Download Students Attendance for this branch"
                    >
                      <Icon name="graduation-cap" size={12} />
                      <span>Students Excel</span>
                    </a>
                    <a
                      href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&branch_id=${b.branch_id}&category=employees${authParam}`}
                      download
                      className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      title="Download Employees Attendance for this branch"
                    >
                      <Icon name="user-check" size={12} />
                      <span>Staff Excel</span>
                    </a>
                    <a
                      href={`/api/v1/ho/attendance-reports/export/excel?year=${targetYear}&month=${targetMonth}&branch_id=${b.branch_id}&category=all${authParam}`}
                      download
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      title="Download Consolidated Branch Excel"
                    >
                      <Icon name="download" size={12} />
                      <span>Branch Excel</span>
                    </a>
                    <a
                      href={`/api/v1/ho/attendance-reports/export/pdf?year=${targetYear}&month=${targetMonth}&branch_id=${b.branch_id}&category=all${authParam}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                      title="Print Branch PDF Statement"
                    >
                      <Icon name="printer" size={12} />
                      <span>Branch PDF</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  const renderDailyAttendanceView = () => {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-blue-600" />
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-400">›</span>
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span className="text-slate-400">›</span>
              <span className="text-slate-900 font-bold">Daily Attendance Report</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              DAILY ATTENDANCE REPORT
            </h1>
            <p className="text-xs text-slate-500 font-medium">Employee &amp; Student daily attendance records with organisation mapping</p>
          </div>
        </div>

        {/* Filter Toolbar Box */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendee Type</label>
              <select
                value={dailyAttendeeType}
                onChange={(e) => setDailyAttendeeType(e.target.value as 'all' | 'employees' | 'students')}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All Attendees</option>
                <option value="employees">Employees Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institute / Campus</label>
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableInstitutesList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch</label>
              <select
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicPlacesList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Check-in Time</label>
              <input
                type="time"
                value={filterCheckinTime}
                onChange={(e) => setFilterCheckinTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Check-out Time</label>
              <input
                type="time"
                value={filterCheckoutTime}
                onChange={(e) => setFilterCheckoutTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fetchData(filterDate)}
              className="px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setDailyAttendeeType('all');
                setSelectedDistrict('All Districts');
                setFilterInstitute('All Institutes');
                setFilterPlace('All Places');
                setFilterStatus('All');
                setSearchTableQuery('');
                setFilterCheckinTime('');
                setFilterCheckoutTime('');
                const todayStr = getTodayDateStr();
                setFilterDate(todayStr);
                fetchData(todayStr);
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-3.5 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Daily Attendance Report</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {filteredDailyAttendance.length} records
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    'Daily_Attendance_Report',
                    ['#', 'INSTITUTE NAME', 'ID / ROLL NO.', 'NAME', 'TYPE', 'DESIGNATION / COURSE', 'CAMPUS / DEPARTMENT', 'ATTENDANCE DATE', 'CHECK-IN TIME', 'CHECK-IN LOCATION', 'CHECK-OUT TIME', 'CHECK-OUT LOCATION', 'STATUS'],
                    filteredDailyAttendance.map((r, i) => [i + 1, r.dist, r.id, r.name, r.attendee_type === 'student' ? 'Student' : 'Employee', r.desg, r.place, filterDate, r.in, r.in_loc, r.out, r.out_loc, r.status])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Icon name="file-text" size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">INSTITUTE NAME</th>
                  <th className="py-3 px-3.5">ID / ROLL NO.</th>
                  <th className="py-3 px-3.5">NAME</th>
                  <th className="py-3 px-3.5">DESIGNATION</th>
                  <th className="py-3 px-3.5">CAMPUS / DEPT</th>
                  <th className="py-3 px-3.5">ATTENDANCE DATE</th>
                  <th className="py-3 px-3.5">CHECK-IN TIME</th>
                  <th className="py-3 px-3.5">CHECK-IN LOCATION</th>
                  <th className="py-3 px-3.5">CHECK-OUT TIME</th>
                  <th className="py-3 px-3.5">CHECK-OUT LOCATION</th>
                  <th className="py-3 px-3.5 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredDailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                      No live attendance records found for this date/criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDailyAttendance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-3.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 text-[10px]">
                            🏛️
                          </span>
                          <div>
                            <span className="truncate max-w-[190px] block" title={row.dist}>
                              {row.dist || '—'}
                            </span>
                            {row.district && row.district !== '—' && (
                              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                                <span>📍</span>
                                <span>{row.district}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 font-bold">{row.id}</td>
                      <td className="py-3 px-3.5 font-extrabold text-slate-900">{row.name}</td>
                      <td className="py-3 px-3.5 text-slate-600">{row.desg}</td>
                      <td className="py-3 px-3.5 text-slate-700">{row.place || '—'}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-600">{filterDate}</td>
                      <td className="py-3 px-3.5 font-mono text-slate-900 font-bold">{row.in}</td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {row.in_loc !== '—' ? (
                          <div>
                            <div className="font-semibold text-slate-800">{row.in_loc}</div>
                            <button
                              type="button"
                              onClick={() => {
                                const q = (row.in_lat && row.in_lng)
                                  ? `${row.in_lat},${row.in_lng}`
                                  : encodeURIComponent(`${row.in_loc}, ${row.dist || ''}`);
                                window.open(`https://maps.google.com/?q=${q}`, '_blank');
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <Icon name="map-pin" size={10} />
                              <span>View on Map</span>
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-900">{row.out}</td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {row.out_loc !== '—' ? (
                          <div>
                            <div className="font-semibold text-slate-800">{row.out_loc}</div>
                            <button
                              type="button"
                              onClick={() => {
                                const q = (row.out_lat && row.out_lng)
                                  ? `${row.out_lat},${row.out_lng}`
                                  : encodeURIComponent(`${row.out_loc}, ${row.dist || ''}`);
                                window.open(`https://maps.google.com/?q=${q}`, '_blank');
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-[10px] font-bold cursor-pointer inline-flex items-center gap-0.5 mt-0.5"
                            >
                              <Icon name="map-pin" size={10} />
                              <span>View on Map</span>
                            </button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border',
                            row.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.status === 'Late'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : row.status === 'Leave'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. DAILY ATTENDANCE ABSTRACT SUBVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const renderDailyAbstractView = () => {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-blue-600" />
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-400">›</span>
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span className="text-slate-400">›</span>
              <span className="text-slate-900 font-bold">Daily Attendance Abstract</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              DAILY ATTENDANCE ABSTRACT
            </h1>
            <p className="text-xs text-slate-500 font-medium">Institute-level daily attendance rollup</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Category / Role</label>
              <select
                value={dailyAttendeeType}
                onChange={(e) => setDailyAttendeeType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All (Staff & Students)</option>
                <option value="employees">Employees</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institution Type</label>
              <select
                value={filterInstType}
                onChange={(e) => setFilterInstType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="All Types">All Types</option>
                <option value="ADDL">ADDL</option>
                <option value="AVH">AVH</option>
                <option value="DVAHO">DVAHO</option>
                <option value="DVH">DVH</option>
                <option value="PVC">PVC</option>
                <option value="SC(AH)">SC(AH)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institute / Campus</label>
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableInstitutesList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch</label>
              <select
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {dynamicPlacesList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fetchData(filterDate)}
              className="px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDistrict('All Districts');
                setFilterInstitute('All Institutes');
                setFilterPlace('All Places');
                setFilterInstType('All Types');
                setSearchTableQuery('');
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Daily Attendance Abstract</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {dynamicDistricts.length} institutes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    'Daily_Attendance_Abstract',
                    ['#', 'INSTITUTE NAME', 'TOTAL STAFF', 'REGISTERED', 'ATTENDED ON TIME', 'LATE COUNT', 'EARLY LEAVING', 'NOT LOGGED OUT', 'ABSENT', 'LEAVE', 'OD'],
                    dynamicDistricts.map((d, i) => [i + 1, d.name, d.total, d.registered, d.attended, d.late, d.early, d.notOut, d.absent, d.leave, d.od])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Icon name="file-text" size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">INSTITUTE NAME</th>
                  <th className="py-3 px-3.5 text-center">TOTAL STAFF</th>
                  <th className="py-3 px-3.5 text-center">REGISTERED</th>
                  <th className="py-3 px-3.5 text-center text-emerald-700">ATTENDED ON TIME</th>
                  <th className="py-3 px-3.5 text-center text-amber-700">LATE COUNT</th>
                  <th className="py-3 px-3.5 text-center text-indigo-700">EARLY LEAVING</th>
                  <th className="py-3 px-3.5 text-center text-orange-700">NOT LOGGED OUT</th>
                  <th className="py-3 px-3.5 text-center text-rose-700">ABSENT</th>
                  <th className="py-3 px-3.5 text-center text-purple-700">LEAVE</th>
                  <th className="py-3 px-3.5 text-center text-sky-700">OD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-medium">
                      No institute rollup records found.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-3.5 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 text-[10px]">
                            🏛️
                          </span>
                          <div>
                            <div>{row.name}</div>
                            {row.district && row.district !== '—' && (
                              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                                <span>📍</span>
                                <span>{row.district}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">{row.total}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-slate-700">{row.registered}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-emerald-700 bg-emerald-50/40">{row.attended}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-amber-700 bg-amber-50/40">{row.late}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-indigo-700">{row.early}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-orange-700">{row.notOut}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-rose-700 bg-rose-50/40">{row.absent}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-purple-700">{row.leave}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-sky-700">{row.od}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. ATTENDANCE ABSTRACT SUBVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const renderAttendanceAbstractView = () => {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-blue-600" />
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-400">›</span>
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span className="text-slate-400">›</span>
              <span className="text-slate-900 font-bold">Attendance Abstract</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              ATTENDANCE ABSTRACT
            </h1>
            <p className="text-xs text-slate-500 font-medium">Aggregate attendance stats per institute</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Scope / Category</label>
              <select
                value={dailyAttendeeType}
                onChange={(e) => setDailyAttendeeType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All (Staff & Students)</option>
                <option value="employees">Employees</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institute / Campus</label>
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableInstitutesList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fetchData(filterDate)}
              className="px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDistrict('All Districts');
                setFilterInstitute('All Institutes');
                setFilterPlace('All Places');
                setFilterInstType('All Types');
                setSearchTableQuery('');
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/90 flex items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-900">Attendance Abstract</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {dynamicDistricts.length} records
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    'Attendance_Abstract',
                    ['NO.', 'INSTITUTE NAME', 'TOTAL NO. OF EMPLOYEES', 'USERS REGISTERED', 'MARKED ATTENDANCE'],
                    dynamicDistricts.map((d, i) => [i + 1, d.name, d.total, d.registered, d.attended])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Icon name="file-text" size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                <tr>
                  <th className="py-3 px-4">NO.</th>
                  <th className="py-3 px-4">INSTITUTE NAME</th>
                  <th className="py-3 px-4 text-center">
                    {dailyAttendeeType === 'employees' ? 'TOTAL NO. OF EMPLOYEES' : dailyAttendeeType === 'students' ? 'TOTAL NO. OF STUDENTS' : 'TOTAL STAFF & STUDENTS'}
                  </th>
                  <th className="py-3 px-4 text-center">USERS REGISTERED</th>
                  <th className="py-3 px-4 text-center text-emerald-700">MARKED ATTENDANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                      No institute attendance data recorded.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-200">
                            <span>🏛️</span>
                            <span>{row.name}</span>
                          </span>
                          {row.district && row.district !== '—' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                              <span>📍</span>
                              <span>{row.district}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700">{row.total}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-700">{row.registered}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-black">{row.attended}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. RANGE ATTENDANCE SUBVIEW
  // ─────────────────────────────────────────────────────────────────────────────

  const renderRangeAttendanceView = () => {
    // Generate day-by-day dates across the selected date range
    const dateRangeColumns = (() => {
      const dates: { dateStr: string; label: string; day: number; month: number; year: number }[] = [];
      try {
        const start = new Date(filterFromDate);
        const end = new Date(filterToDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;
        const cur = new Date(start);
        while (cur <= end && dates.length <= 62) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const label = `${d}/${m}`;
          dates.push({ dateStr, label, day: cur.getDate(), month: cur.getMonth() + 1, year: y });
          cur.setDate(cur.getDate() + 1);
        }
      } catch (e) {}
      return dates;
    })();

    // Helper: Determine if person is Present or Absent on date
    const getPersonDayStatus = (personRow: AttendanceRowItem, dateInfo: { day: number; dateStr: string }) => {
      if (attendanceMatrix?.employees && Array.isArray(attendanceMatrix.employees)) {
        const pCleanCode = (personRow.id || '').replace(/\D/g, '');
        const pCleanId = (personRow.id || '').toLowerCase().replace(/^(emp_|cust_)/, '');
        const pName = (personRow.name || '').toLowerCase().trim();

        const mEmp = attendanceMatrix.employees.find((m: any) => {
          const mCleanCode = (m.code || '').replace(/\D/g, '');
          const mCleanId = (m.id || '').toLowerCase().replace(/^(emp_|cust_)/, '');
          const mName = (m.name || '').toLowerCase().trim();
          return (
            (m.id && personRow.id && m.id.toLowerCase() === personRow.id.toLowerCase()) ||
            (pCleanCode && mCleanCode && pCleanCode === mCleanCode) ||
            (pCleanId && mCleanId && pCleanId === mCleanId) ||
            (pName && mName && (pName === mName || pName.includes(mName) || mName.includes(pName)))
          );
        });

        if (mEmp && mEmp.days) {
          const dInfo = mEmp.days[dateInfo.day] || mEmp.days[String(dateInfo.day)];
          if (dInfo) {
            const isPres =
              dInfo.code === 'P' ||
              dInfo.code === 'HD' ||
              dInfo.status === 'Present' ||
              dInfo.status_label === 'Present' ||
              (dInfo.check_in && dInfo.check_in !== '--:--' && dInfo.check_in !== '-');
            return isPres ? 'P' : 'A';
          }
        }
      }

      if (dateInfo.dateStr === filterDate) {
        const isPres =
          personRow.status === 'Present' ||
          personRow.status === 'Late' ||
          (personRow.in && personRow.in !== '—' && personRow.in !== '--:--');
        return isPres ? 'P' : 'A';
      }

      return 'A';
    };

    // Filtered branches for Abstract view
    let abstractBranchRows: BranchItem[] = allBranchesList.length > 0
      ? allBranchesList
      : dynamicDistricts.map((d) => ({
          id: d.name,
          branch_name: d.district || '',
          vahd_name: d.name,
          name: d.name,
          city: d.district || '',
          district: d.district || ''
        }));

    if (selectedDistrict !== 'All Districts') {
      abstractBranchRows = abstractBranchRows.filter((b) => {
        const dist = b.district || b.city || b.branch_name || '';
        const name = b.vahd_name || b.name || b.branch_name;
        return dist.toLowerCase() === selectedDistrict.toLowerCase() || name.toLowerCase().includes(selectedDistrict.toLowerCase());
      });
    }

    if (filterInstitute !== 'All Institutes' && filterInstitute !== 'All Districts') {
      abstractBranchRows = abstractBranchRows.filter((b) => {
        const name = b.vahd_name || b.name || b.branch_name;
        return name.toLowerCase() === filterInstitute.toLowerCase();
      });
    }

    if (searchTableQuery.trim()) {
      const q = searchTableQuery.toLowerCase();
      abstractBranchRows = abstractBranchRows.filter((b) => {
        const name = (b.vahd_name || b.name || b.branch_name || '').toLowerCase();
        const branch = (b.branch_name || b.city || '').toLowerCase();
        return name.includes(q) || branch.includes(q);
      });
    }

    // Helper: Compute organisation day count (Present or Absent)
    const getOrgDayCount = (branchObj: { id: string; branch_name: string; vahd_name?: string; name?: string; city?: string }, dateInfo: { day: number; dateStr: string }, wantAbsent = false) => {
      const orgKey = (branchObj.vahd_name || branchObj.name || branchObj.branch_name || '').toLowerCase();
      const branchName = (branchObj.branch_name || branchObj.city || '').toLowerCase();

      const bEmployees = employees.filter((e) => {
        const bId = e.branch_id;
        const vBranch = (e.vahd_branch || '').toLowerCase();
        const inst = (e.institute_name || e.organization_name || '').toLowerCase();
        return (
          bId === branchObj.id ||
          (orgKey && vBranch === orgKey) ||
          (branchName && vBranch === branchName) ||
          (orgKey && inst === orgKey)
        );
      });

      const bStudents = students.filter((s) => {
        const meta = s.meta_data || {};
        const loc = (s.primary_vahd_location || '').toLowerCase();
        const inst = (s.institute_name || meta.college_name || '').toLowerCase();
        return (
          s.branch_id === branchObj.id ||
          s.tenant_id === branchObj.id ||
          (orgKey && loc.includes(orgKey)) ||
          (orgKey && inst === orgKey)
        );
      });

      const members: Array<{ id: string; code?: string; name?: string; is_present?: boolean }> = [];
      if (dailyAttendeeType === 'all' || dailyAttendeeType === 'employees') {
        bEmployees.forEach((e) => {
          members.push({
            id: e.id,
            code: e.code,
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.first_name || 'Staff'
          });
        });
      }
      if (dailyAttendeeType === 'all' || dailyAttendeeType === 'students') {
        bStudents.forEach((s) => {
          members.push({
            id: s.id,
            code: s.member_code || s.roll_number,
            name: s.full_name || 'Student',
            is_present: s.is_present || s.isPresentToday || s.today_status === 'Present'
          });
        });
      }

      if (members.length === 0) return 0;

      let presCount = 0;
      let absCount = 0;

      members.forEach((m) => {
        let isPres = false;
        if (attendanceMatrix?.employees && Array.isArray(attendanceMatrix.employees)) {
          const mCleanCode = (m.code || '').replace(/\D/g, '');
          const mCleanId = (m.id || '').toLowerCase().replace(/^(emp_|cust_)/, '');
          const mName = (m.name || '').toLowerCase().trim();

          const matrixRow = attendanceMatrix.employees.find((me: any) => {
            const meCleanCode = (me.code || '').replace(/\D/g, '');
            const meCleanId = (me.id || '').toLowerCase().replace(/^(emp_|cust_)/, '');
            const meName = (me.name || '').toLowerCase().trim();
            return (
              (me.id && m.id && me.id.toLowerCase() === m.id.toLowerCase()) ||
              (mCleanCode && meCleanCode && mCleanCode === meCleanCode) ||
              (mCleanId && meCleanId && mCleanId === meCleanId) ||
              (mName && meName && (mName === meName || mName.includes(meName) || meName.includes(mName)))
            );
          });

          if (matrixRow && matrixRow.days) {
            const dInfo = matrixRow.days[dateInfo.day] || matrixRow.days[String(dateInfo.day)];
            if (dInfo) {
              isPres =
                dInfo.code === 'P' ||
                dInfo.code === 'HD' ||
                dInfo.status === 'Present' ||
                dInfo.status_label === 'Present' ||
                (dInfo.check_in && dInfo.check_in !== '--:--' && dInfo.check_in !== '-');
            }
          }
        }

        if (!isPres && dateInfo.dateStr === filterDate) {
          if (m.is_present) isPres = true;
        }

        if (isPres) {
          presCount += 1;
        } else {
          absCount += 1;
        }
      });

      return wantAbsent ? absCount : presCount;
    };

    const rangeDisplayRows =
      dailyAttendeeType === 'employees'
        ? filteredDailyAttendance.filter((r) => r.attendee_type === 'employee')
        : dailyAttendeeType === 'students'
        ? filteredDailyAttendance.filter((r) => r.attendee_type === 'student')
        : filteredDailyAttendance;

    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-blue-600" />
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-400">›</span>
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span className="text-slate-400">›</span>
              <span className="text-slate-900 font-bold">Range Attendance</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              RANGE ATTENDANCE
            </h1>
            <p className="text-xs text-slate-500 font-medium">Report, Detail, Abstract, Employees, and Students views across a date range</p>
          </div>
        </div>

        {/* Filter Toolbar with Range Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Scope / Category</label>
              <select
                value={dailyAttendeeType}
                onChange={(e) => setDailyAttendeeType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All (Staff & Students)</option>
                <option value="employees">Employees Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>
            {rangeTabMode === 'Abstract' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendance Metric</label>
                <select
                  value={rangeMetric}
                  onChange={(e) => setRangeMetric(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="Present">Present Count</option>
                  <option value="Absent">Absent Count</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  {availableDistrictsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institute / Campus</label>
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableInstitutesList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Range Tab Switcher */}
            <div className="bg-slate-50 p-1 rounded-xl flex items-center border border-slate-200/90 text-xs gap-1 overflow-x-auto max-w-full">
              {(['Report', 'Detail', 'Abstract'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRangeTabMode(tab)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0',
                    rangeTabMode === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  )}
                >
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchData(filterDate)}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDistrict('All Districts');
                  setFilterInstitute('All Institutes');
                  setSearchTableQuery('');
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  const rows = rangeDisplayRows;
                  if (rangeTabMode === 'Abstract') {
                    handleExportCSV(
                      `Range_Attendance_Abstract_${filterFromDate}_to_${filterToDate}`,
                      ['ORGANISATION & BRANCH', ...dateRangeColumns.map((d) => d.label)],
                      abstractBranchRows.map((br) => {
                        const orgName = br.vahd_name || br.name || br.branch_name;
                        const branchName = br.branch_name || br.city || '—';
                        return [
                          `${orgName} - ${branchName}`,
                          ...dateRangeColumns.map((d) => getOrgDayCount(br, d, rangeMetric === 'Absent'))
                        ];
                      })
                    );
                  } else if (rangeTabMode === 'Detail') {
                    handleExportCSV(
                      `Range_Attendance_Detail_${filterFromDate}_to_${filterToDate}`,
                      ['#', 'EMPLOYEE NO', 'NAME', 'DISTRICT', 'BRANCH', ...dateRangeColumns.map((d) => d.label)],
                      rows.map((r, i) => [
                        i + 1,
                        r.id,
                        r.name,
                        r.district || r.dist,
                        r.place,
                        ...dateRangeColumns.map((d) => getPersonDayStatus(r, d))
                      ])
                    );
                  } else {
                    handleExportCSV(
                      `Range_Attendance_Report_${filterFromDate}_to_${filterToDate}`,
                      ['#', 'ID / ROLL NO', 'NAME', 'TYPE', 'INSTITUTE NAME', 'BRANCH', 'PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'TOTAL', 'ATTENDANCE %'],
                      rows.map((r, i) => [i + 1, r.id, r.name, r.attendee_type === 'student' ? 'Student' : 'Employee', r.dist, r.place, r.status === 'Present' ? 1 : 0, r.status === 'Late' ? 1 : 0, r.status === 'Absent' ? 1 : 0, r.status === 'Leave' ? 1 : 0, 1, r.status === 'Absent' ? '0%' : '100%'])
                    );
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Icon name="file-text" size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Range Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-slate-200/90 bg-slate-50/60 flex items-center justify-between">
            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
              <span>
                {rangeTabMode === 'Detail'
                  ? `Detail — ${dailyAttendeeType === 'students' ? 'Student' : dailyAttendeeType === 'employees' ? 'Employee' : 'Personnel'} × Day`
                  : rangeTabMode === 'Abstract'
                  ? 'Abstract — District × Day'
                  : 'Report — Consolidated Attendance Totals'}, {filterFromDate} to {filterToDate}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono">
                {rangeTabMode === 'Abstract' ? abstractBranchRows.length : rangeDisplayRows.length} records
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {rangeTabMode === 'Abstract' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">ORGANISATION &amp; BRANCH</th>
                    {dateRangeColumns.map((d) => (
                      <th key={d.dateStr} className="py-3 px-2 text-center text-[10px] font-mono tracking-tight whitespace-nowrap">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {abstractBranchRows.length === 0 ? (
                    <tr>
                      <td colSpan={dateRangeColumns.length + 1} className="py-12 text-center text-slate-400 font-medium">
                        No organisation records found.
                      </td>
                    </tr>
                  ) : (
                    abstractBranchRows.map((br, idx) => {
                      const orgName = br.vahd_name || br.name || br.branch_name;
                      const branchName = br.branch_name || br.city || '—';
                      return (
                        <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                          <td className="py-3 px-3.5 font-extrabold text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0 text-[10px]">
                                🏛️
                              </span>
                              <span className="font-bold text-slate-800">{orgName} - {branchName}</span>
                            </div>
                          </td>
                          {dateRangeColumns.map((d) => {
                            const count = getOrgDayCount(br, d, rangeMetric === 'Absent');
                            return (
                              <td key={d.dateStr} className="py-3 px-2 text-center font-mono font-bold text-slate-800">
                                {count}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : rangeTabMode === 'Detail' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                  <tr>
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">EMPLOYEE NO</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">NAME</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">DISTRICT</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">BRANCH</th>
                    {dateRangeColumns.map((d) => (
                      <th key={d.dateStr} className="py-3 px-2 text-center text-[10px] font-mono whitespace-nowrap">
                        {d.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangeDisplayRows.length === 0 ? (
                    <tr>
                      <td colSpan={dateRangeColumns.length + 5} className="py-12 text-center text-slate-400 font-medium">
                        No detail attendance records found.
                      </td>
                    </tr>
                  ) : (
                    rangeDisplayRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-3.5 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-700 font-bold whitespace-nowrap">{row.id}</td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-900 whitespace-nowrap">{row.name}</td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">{row.district || row.dist}</td>
                        <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">{row.place}</td>
                        {dateRangeColumns.map((d) => {
                          const stCode = getPersonDayStatus(row, d);
                          return (
                            <td key={d.dateStr} className="py-3 px-2 text-center">
                              {stCode === 'P' ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                  P
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px]">
                                  A
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* Report (Consolidated) */
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                  <tr>
                    <th className="py-3 px-3.5">#</th>
                    <th className="py-3 px-3.5">ID / ROLL NO</th>
                    <th className="py-3 px-3.5">NAME</th>
                    <th className="py-3 px-3.5">TYPE</th>
                    <th className="py-3 px-3.5">INSTITUTE NAME</th>
                    <th className="py-3 px-3.5">BRANCH</th>
                    <th className="py-3 px-3.5 text-center text-emerald-700">PRESENT</th>
                    <th className="py-3 px-3.5 text-center text-amber-700">LATE</th>
                    <th className="py-3 px-3.5 text-center text-rose-700">ABSENT</th>
                    <th className="py-3 px-3.5 text-center text-purple-700">LEAVE</th>
                    <th className="py-3 px-3.5 text-center">TOTAL</th>
                    <th className="py-3 px-3.5 text-center">ATTENDANCE %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rangeDisplayRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 font-medium">
                        No range attendance records found.
                      </td>
                    </tr>
                  ) : (
                    rangeDisplayRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3 px-3.5 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-700 font-bold">{row.id}</td>
                        <td className="py-3 px-3.5 font-extrabold text-slate-900">{row.name}</td>
                        <td className="py-3 px-3.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border',
                              row.attendee_type === 'student'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {row.attendee_type === 'student' ? 'Student' : 'Employee'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-bold">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
                            <span>🏛️</span>
                            <span>{row.dist}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">{row.place}</td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                          {row.status === 'Present' ? 1 : 0}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-amber-700 bg-amber-50/30">
                          {row.status === 'Late' ? 1 : 0}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-rose-700 bg-rose-50/30">
                          {row.status === 'Absent' ? 1 : 0}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-purple-700">
                          {row.status === 'Leave' ? 1 : 0}
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900">1</td>
                        <td className="py-3 px-3.5 text-center">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono border',
                              row.status === 'Absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}
                          >
                            {row.status === 'Absent' ? '0%' : '100%'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GENERIC DRILLDOWN SUBVIEW (For remaining cards)
  const renderGenericReportView = () => {
    const activeConfig =
      [...combinedAttendanceCards, ...dailyAbstractCards, ...hrmsAnalyticsCards].find((c) => c.id === selectedReport) ||
      combinedAttendanceCards[0];

    return (
      <div className="space-y-4 animate-fade-in font-sans text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
              <Icon name="home" size={13} className="text-blue-600" />
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-400">›</span>
              <button
                type="button"
                onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span className="text-slate-400">›</span>
              <span className="text-slate-900 font-bold">{activeConfig.title}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {activeConfig.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium">{activeConfig.description}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Scope / Category</label>
              <select
                value={dailyAttendeeType}
                onChange={(e) => setDailyAttendeeType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">All (Staff & Students)</option>
                <option value="employees">Employees</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Institute / Campus</label>
              <select
                value={filterInstitute}
                onChange={(e) => setFilterInstitute(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {availableInstitutesList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => fetchData(filterDate)}
              className="px-5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm cursor-pointer"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDistrict('All Districts');
                setFilterInstitute('All Institutes');
                setFilterPlace('All Places');
                setFilterInstType('All Types');
                setSearchTableQuery('');
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center font-bold', activeConfig.iconBg)}>
                <Icon name={activeConfig.icon} size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{activeConfig.title} Overview</h3>
                <p className="text-xs text-slate-500">{activeConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    activeConfig.title.replace(/\s+/g, '_'),
                    ['INSTITUTE NAME', 'METRIC', 'VALUE', 'DATE'],
                    dynamicDistricts.map((d) => [d.name, activeConfig.title, d.total, filterDate])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <Icon name="download" size={13} />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Icon name="file-text" size={13} />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200/90">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">INSTITUTE NAME</th>
                  <th className="py-3 px-4 text-center">Total Staff</th>
                  <th className="py-3 px-4 text-center text-emerald-700">Compliant Count</th>
                  <th className="py-3 px-4 text-center text-amber-700">Pending Review</th>
                  <th className="py-3 px-4 text-center text-rose-700">Flagged Exceptions</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No operational unit records found.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((d, i) => (
                    <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-medium">{i + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-200">
                            <span>🏛️</span>
                            <span>{d.name}</span>
                          </span>
                          {d.district && d.district !== '—' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[11px] border border-slate-200">
                              <span>📍</span>
                              <span>{d.district}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{d.total}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-700 bg-emerald-50/30">{d.attended}</td>
                      <td className="py-3 px-4 text-center font-mono text-amber-700 bg-amber-50/30">{d.late}</td>
                      <td className="py-3 px-4 text-center font-mono text-rose-700 bg-rose-50/30">{d.absent}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Operational
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN REPORTS HUB / DIRECTORY (Matching User Screenshot 1)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCard = (card: ReportCardConfig) => {
    const isSpecial = card.id === 'employee-attendance';
    return (
      <div
        key={card.id}
        onClick={() => {
          setSelectedReport(card.id);
          if (card.category === 'students') setHubCategory('students');
          else if (card.category === 'employees') setHubCategory('employees');
          else if (card.category === 'branches') setHubCategory('branches');
        }}
        className={cn(
          'rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden min-h-[175px]',
          isSpecial
            ? 'bg-gradient-to-br from-white via-white to-purple-50/50 border-2 border-indigo-400/90 hover:border-indigo-500 ring-2 ring-indigo-500/10'
            : 'bg-gradient-to-br from-white via-white to-slate-50/40 border border-slate-200/90 hover:border-slate-300'
        )}
      >
        <div>
          {/* Top row: Icon on left, Badge on right */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105',
                card.iconBg
              )}
            >
              <Icon name={card.icon} size={17} className={card.iconColor} />
            </div>

            {card.badge && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider',
                  card.category === 'students'
                    ? 'bg-blue-100/90 text-blue-700 border border-blue-200/70'
                    : card.category === 'employees'
                    ? 'bg-purple-100/90 text-purple-700 border border-purple-200/70'
                    : 'bg-indigo-100/90 text-indigo-700 border border-indigo-200/70'
                )}
              >
                {card.badge}
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug mt-3 mb-1.5">
            {card.title}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            {card.description}
          </p>
        </div>

        {/* Bottom row: circular arrow button */}
        <div className="flex justify-end pt-3">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shadow-2xs',
              isSpecial
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-orange-500/25 group-hover:scale-110'
                : 'bg-white border border-slate-200/90 text-slate-500 group-hover:text-slate-900 group-hover:border-slate-300 group-hover:translate-x-0.5'
            )}
          >
            <Icon name="arrow-right" size={13} />
          </div>
        </div>

        {/* Subtle bottom-right glow */}
        <div
          className={cn(
            'absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-xl pointer-events-none opacity-40',
            isSpecial ? 'bg-purple-200' : 'bg-slate-100'
          )}
        />
      </div>
    );
  };

  const renderDirectoryCards = () => {
    return (
      <div className="space-y-4">
        {/* SECTION 1: Combined Attendance Reports */}
        {(hubCategory === 'all' || hubCategory === 'students' || hubCategory === 'employees' || hubCategory === 'branches') && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <Icon name="layers" size={16} className="text-purple-600" />
              <span>
                {hubCategory === 'students'
                  ? 'Student Attendance Statements & Exports'
                  : hubCategory === 'employees'
                    ? 'Employee Attendance Statements & Exports'
                    : hubCategory === 'branches'
                      ? 'Multi-Branch Headquarters Reports'
                      : 'Combined Attendance Reports'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-3.5">
              {combinedAttendanceCards
                .filter((c) => {
                  if (hubCategory === 'students') return c.category === 'students';
                  if (hubCategory === 'employees') return c.category === 'employees';
                  if (hubCategory === 'branches') return c.category === 'branches';
                  return true;
                })
                .filter(
                  (c) =>
                    !searchReportDirectory.trim() ||
                    c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) ||
                    c.description.toLowerCase().includes(searchReportDirectory.toLowerCase())
                )
                .map(renderCard)}
            </div>
          </div>
        )}

        {/* SECTION 2: Daily Abstracts */}
        {(hubCategory === 'all' || hubCategory === 'employees') && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
              <span className="text-base">📊</span>
              <span>Daily Biometric Abstracts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {dailyAbstractCards
                .filter(
                  (c) =>
                    !searchReportDirectory.trim() ||
                    c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) ||
                    c.description.toLowerCase().includes(searchReportDirectory.toLowerCase())
                )
                .map(renderCard)}
            </div>
          </div>
        )}

        {/* SECTION 3: HRMS & Performance Analytics */}
        {(hubCategory === 'all' || hubCategory === 'employees') && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 text-sm font-extrabold text-purple-700">
              <span className="text-base">📈</span>
              <span>HRMS &amp; Performance Analytics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {hrmsAnalyticsCards
                .filter(
                  (c) =>
                    !searchReportDirectory.trim() ||
                    c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) ||
                    c.description.toLowerCase().includes(searchReportDirectory.toLowerCase())
                )
                .map(renderCard)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full bg-transparent w-full px-4 sm:px-6 py-4 space-y-4 font-sans text-slate-900">
      {!selectedReport && (
        <>
          {/* Main Directory Header & Global Directory Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                <Icon name="home" size={13} className="text-blue-600" />
                <button
                  type="button"
                  onClick={() => { setSelectedReport(null); setHubCategory('all'); }}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Home
                </button>
                <span className="text-slate-400">›</span>
                <span className="text-slate-900 font-black">Reports</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon name="bar-chart-2" size={17} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
                    Reports &amp; Analytics
                  </h1>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
                    Institute-level analytics, exportable attendance statements, and multi-campus progress tracking.
                  </p>
                </div>
              </div>
            </div>

            {/* Global Search Bar */}
            <div className="relative w-full sm:w-80">
              <Icon name="search" size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search report modules..."
                value={searchReportDirectory}
                onChange={(e) => setSearchReportDirectory(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 text-xs rounded-full bg-white border border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold shadow-2xs"
              />
            </div>
          </div>

          {/* Category Navigation Pills matching Reference Screenshot */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {[
              { id: 'all', label: 'All Report Modules', icon: 'layers' },
              { id: 'students', label: 'Students Attendance', icon: 'graduation-cap' },
              { id: 'employees', label: 'Employees Attendance', icon: 'users' },
              { id: 'branches', label: 'Multi-Branch Consolidated', icon: 'building-2' },
            ].map((tab) => {
              const isTabActive = tab.id === hubCategory;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'all') {
                      setSelectedReport(null);
                      setHubCategory('all');
                    } else if (tab.id === 'students') {
                      setSelectedReport('student-attendance');
                      setHubCategory('students');
                    } else if (tab.id === 'employees') {
                      setSelectedReport('employee-attendance');
                      setHubCategory('employees');
                    } else if (tab.id === 'branches') {
                      setSelectedReport('branch-consolidated');
                      setHubCategory('branches');
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                    isTabActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-2xs'
                  )}
                >
                  <Icon name={tab.icon} size={14} className={isTabActive ? 'text-white' : 'text-slate-500'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Dynamic Content View */}
      {selectedReport === 'student-attendance'
        ? renderStudentAttendanceView()
        : selectedReport === 'employee-attendance'
        ? renderEmployeeAttendanceView()
        : selectedReport === 'branch-consolidated'
        ? renderBranchConsolidatedView()
        : selectedReport === 'daily-attendance'
        ? renderDailyAttendanceView()
        : selectedReport === 'daily-abstract'
        ? renderDailyAbstractView()
        : selectedReport === 'attendance-abstract'
        ? renderAttendanceAbstractView()
        : selectedReport === 'range-attendance'
        ? renderRangeAttendanceView()
        : selectedReport
        ? renderGenericReportView()
        : renderDirectoryCards()}
    </div>
  );
}
