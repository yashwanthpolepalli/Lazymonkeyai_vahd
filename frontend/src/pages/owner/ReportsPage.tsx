import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { hrmsApi, EmployeeItem, DepartmentItem, AttendanceRecord } from '@/services/hrmsApi';
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
}

const combinedAttendanceCards: ReportCardConfig[] = [
  {
    id: 'daily-attendance',
    title: 'Daily Attendance Report',
    description: 'Detailed shift check-in/out logs per employee with geofence & verification mode',
    icon: 'clipboard-list',
    iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'daily-abstract',
    title: 'Daily Abstract',
    description: 'District & mandal aggregated present, late, absent counts and percentages',
    icon: 'file-bar-chart',
    iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    id: 'attendance-abstract',
    title: 'Attendance Abstract',
    description: 'Place of working summaries, branch operational status and roster ratios',
    icon: 'table',
    iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    id: 'range-attendance',
    title: 'Range Attendance',
    description: 'Custom date range shift analysis, multi-day summaries and exportable roster matrices',
    icon: 'calendar',
    iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    id: 'late-attendance-report',
    title: 'Late Attendance Report',
    description: 'Log of staff arriving past grace period with timestamp variance & penalty markers',
    icon: 'clock',
    iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    id: 'not-logged-out-report',
    title: 'Not Logged Out Report',
    description: 'Employees with missing clock-out timestamps requiring administrative override',
    icon: 'alert-circle',
    iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
    iconColor: 'text-rose-600',
  },
];

const dailyAbstractCards: ReportCardConfig[] = [
  {
    id: 'not-logged-out-abstract',
    title: 'Not Logged Out Abstract',
    description: 'District-wise consolidated headcount of open shifts and auto-closed logs',
    icon: 'alert-triangle',
    iconBg: 'bg-orange-50 text-orange-600 border border-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    id: 'late-attendance-abstract',
    title: 'Late Attendance Abstract',
    description: 'District-wise aggregate of late check-ins and average delay minutes',
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
    description: 'Biometric & face ID enrolment status breakdown across all veterinary institutions',
    icon: 'scan-face',
    iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'districts-abstract',
    title: 'Districts Abstract',
    description: 'High-level executive comparison matrix across all 33 Telangana districts',
    icon: 'map-pin',
    iconBg: 'bg-teal-50 text-teal-600 border border-teal-100',
    iconColor: 'text-teal-600',
  },
];

const hrmsAnalyticsCards: ReportCardConfig[] = [
  {
    id: 'departments-abstract',
    title: 'Departments Abstract',
    description: 'Breakdown by Clinical, Administration, Field Staff, Laboratory and Research wings',
    icon: 'building-2',
    iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    id: 'designations-abstract',
    title: 'Designations Abstract',
    description: 'Attendance fidelity categorized by rank: DVAHO, VAS, Veterinary Assistant, Attenders',
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

export function ReportsPage({ embedded = false }: { embedded?: boolean }) {
  // Navigation & Active Sub-view
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [searchReportDirectory, setSearchReportDirectory] = useState('');

  // Live Data from API
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Common Filters for Drill-Downs
  const [filterDistrict, setFilterDistrict] = useState('All Districts');
  const [filterPlace, setFilterPlace] = useState('All Places');
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterFromDate, setFilterFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [filterToDate, setFilterToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterCheckinTime, setFilterCheckinTime] = useState('');
  const [filterCheckoutTime, setFilterCheckoutTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterInstType, setFilterInstType] = useState('All Types');
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [rangeTabMode, setRangeTabMode] = useState<'Report' | 'Detail' | 'Abstract'>('Report');

  // Load backend data dynamically based on selected date
  const fetchData = async (dateToFetch?: string) => {
    setLoading(true);
    try {
      const targetDate = dateToFetch || filterDate;
      const [empRes, deptRes, attRes] = await Promise.all([
        hrmsApi.getEmployees().catch(() => []),
        hrmsApi.getDepartments().catch(() => []),
        hrmsApi.getAttendance(targetDate).catch(() => [])
      ]);
      setEmployees(Array.isArray(empRes) ? empRes : []);
      setDepartments(Array.isArray(deptRes) ? deptRes : []);
      setAttendance(Array.isArray(attRes) ? attRes : []);
    } catch (err) {
      console.error('Failed to load reports data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filterDate);
  }, [filterDate]);

  // Dynamic district rollup computed live from employee attendance records
  const dynamicDistricts = useMemo(() => {
    if (employees.length === 0 && attendance.length === 0) {
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
    }>();

    // Map attendance records by employee
    const attMap = new Map<string, AttendanceRecord>();
    attendance.forEach((att) => {
      if (att.employee_id) attMap.set(att.employee_id, att);
      if (att.employee_code) attMap.set(att.employee_code, att);
    });

    employees.forEach((emp) => {
      const dName = emp.address || emp.gym_branch || 'Hyderabad';
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
          od: 0
        });
      }
      const st = distGroups.get(dName)!;
      st.total += 1;
      st.registered += 1;

      const att = attMap.get(emp.id) || attMap.get(emp.code);
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

    return Array.from(distGroups.entries()).map(([name, stats]) => ({
      name,
      ...stats
    }));
  }, [employees, attendance]);

  // Built dynamic employee daily rows from live database records
  const employeeAttendanceRows = useMemo(() => {
    const attMap = new Map<string, AttendanceRecord>();
    attendance.forEach((att) => {
      if (att.employee_id) attMap.set(att.employee_id, att);
      if (att.employee_code) attMap.set(att.employee_code, att);
    });

    const recordedEmpIds = new Set<string>();

    const rowsFromEmployees = employees.map((emp, idx) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.full_name || 'Staff Member';
      const empId = emp.code || emp.id || `EMP-${1000 + idx}`;
      const att = attMap.get(emp.id) || attMap.get(emp.code);

      if (emp.id) recordedEmpIds.add(emp.id);
      if (emp.code) recordedEmpIds.add(emp.code);

      const inTime = att?.check_in && att.check_in !== '--:--' ? att.check_in : '—';
      const outTime = att?.check_out && att.check_out !== '--:--' ? att.check_out : '—';
      const hasPunched = inTime !== '—';

      let status = 'Absent';
      if (att?.status) {
        status = att.status;
      } else if (hasPunched) {
        status = 'Present';
      } else if (emp.status && emp.status.toLowerCase() !== 'active') {
        status = emp.status;
      }

      const branchOrDept = emp.gym_branch || emp.department || 'Main Facility';
      const dist = emp.address || emp.gym_branch || 'Hyderabad';
      const loc = att?.notes?.includes('Punch via')
        ? att.notes.replace('Punch via', '').trim()
        : (emp.gym_branch ? `${emp.gym_branch} Campus` : 'Main Campus');

      return {
        name: fullName,
        id: empId,
        desg: emp.designation || 'Staff',
        place: branchOrDept,
        dist: dist,
        in: inTime,
        out: outTime,
        loc: hasPunched ? loc : '—',
        status: status
      };
    });

    // Also include attendance records that don't match any employee directly
    const extraRows = attendance
      .filter((att) => !recordedEmpIds.has(att.employee_id) && !recordedEmpIds.has(att.employee_code))
      .map((att, idx) => {
        const inTime = att.check_in && att.check_in !== '--:--' ? att.check_in : '—';
        const outTime = att.check_out && att.check_out !== '--:--' ? att.check_out : '—';
        const hasPunched = inTime !== '—';

        return {
          name: att.employee_name || 'Staff Member',
          id: att.employee_code || att.employee_id || `STAFF-${idx + 1}`,
          desg: att.designation || 'Staff',
          place: att.department || 'Main Facility',
          dist: 'Hyderabad',
          in: inTime,
          out: outTime,
          loc: hasPunched ? (att.notes || 'Biometric Device') : '—',
          status: att.status || (hasPunched ? 'Present' : 'Absent')
        };
      });

    return [...rowsFromEmployees, ...extraRows];
  }, [employees, attendance]);

  // Dynamic filter lists from live records
  const dynamicDistrictsList = useMemo(() => {
    const list = Array.from(new Set(employeeAttendanceRows.map((r) => r.dist).filter(Boolean)));
    const merged = Array.from(new Set([...list, ...DISTRICTS.filter((d) => d !== 'All Districts')]));
    return ['All Districts', ...merged];
  }, [employeeAttendanceRows]);

  const dynamicPlacesList = useMemo(() => {
    const list = Array.from(new Set(employeeAttendanceRows.map((r) => r.place).filter(Boolean)));
    const merged = Array.from(new Set([...list, ...PLACES_OF_WORKING.filter((p) => p !== 'All Places')]));
    return ['All Places', ...merged];
  }, [employeeAttendanceRows]);

  // Filtered rows for Daily Attendance Report
  const filteredDailyAttendance = useMemo(() => {
    return employeeAttendanceRows.filter((r) => {
      const matchDist = filterDistrict === 'All Districts' || r.dist.toLowerCase() === filterDistrict.toLowerCase();
      const matchPlace = filterPlace === 'All Places' || r.place.toLowerCase() === filterPlace.toLowerCase();
      const matchStatus = filterStatus === 'All' || r.status.toLowerCase() === filterStatus.toLowerCase();
      const matchQuery =
        !searchTableQuery.trim() ||
        r.name.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.desg.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.dist.toLowerCase().includes(searchTableQuery.toLowerCase()) ||
        r.place.toLowerCase().includes(searchTableQuery.toLowerCase());
      return matchDist && matchPlace && matchStatus && matchQuery;
    });
  }, [employeeAttendanceRows, filterDistrict, filterPlace, filterStatus, searchTableQuery]);

  // Export to CSV helper
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
    const escapeCell = (cell: string | number | undefined | null) => {
      if (cell === null || cell === undefined) return '""';
      const str = String(cell);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.map(escapeCell).join(','),
        ...rows.map((row) => row.map(escapeCell).join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DRILL-DOWN SUBVIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  if (selectedReport === 'daily-attendance') {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-navy-900">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="hover:text-purple-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span>›</span>
              <span className="text-navy-700">Daily Attendance</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900 uppercase">
              DAILY ATTENDANCE REPORT
            </h1>
            <p className="text-xs text-navy-500 font-medium">Employee-level daily attendance records</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back to Reports</span>
          </button>
        </div>

        {/* Filter Toolbar Box */}
        <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">District</label>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Place of Working</label>
              <select
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicPlacesList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Check-in Time</label>
              <input
                type="time"
                value={filterCheckinTime}
                onChange={(e) => setFilterCheckinTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Check-out Time</label>
              <input
                type="time"
                value={filterCheckoutTime}
                onChange={(e) => setFilterCheckoutTime(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-medium text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-navy-50">
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
                setFilterDistrict('All Districts');
                setFilterPlace('All Places');
                setFilterStatus('All');
                setSearchTableQuery('');
                setFilterCheckinTime('');
                setFilterCheckoutTime('');
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-navy-200 text-navy-700 hover:bg-navy-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-3.5 border-b border-navy-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-50/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-navy-900">Daily Attendance Report</span>
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
                    ['#', 'DISTRICT', 'EMPLOYEE ID', 'NAME', 'DESIGNATION', 'INSTITUTION', 'ATTENDANCE DATE', 'CHECK-IN TIME', 'LOCATION', 'CHECK-OUT TIME', 'STATUS'],
                    filteredDailyAttendance.map((r, i) => [i + 1, r.dist, r.id, r.name, r.desg, r.place, filterDate, r.in, r.loc, r.out, r.status])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
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
              <thead className="bg-navy-50/70 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">DISTRICT</th>
                  <th className="py-3 px-3.5">EMPLOYEE ID</th>
                  <th className="py-3 px-3.5">NAME</th>
                  <th className="py-3 px-3.5">DESIGNATION</th>
                  <th className="py-3 px-3.5">INSTITUTION</th>
                  <th className="py-3 px-3.5">ATTENDANCE DATE</th>
                  <th className="py-3 px-3.5">CHECK-IN TIME</th>
                  <th className="py-3 px-3.5">CHECK-IN LOCATION</th>
                  <th className="py-3 px-3.5">CHECK-OUT TIME</th>
                  <th className="py-3 px-3.5">CHECK-OUT LOCATION</th>
                  <th className="py-3 px-3.5 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 font-medium">
                {filteredDailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-navy-400 font-medium">
                      No live attendance records found for this date/criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDailyAttendance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-3.5 text-navy-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-bold text-navy-800">{row.dist || '—'}</td>
                      <td className="py-3 px-3.5 font-mono text-navy-600 font-bold">{row.id}</td>
                      <td className="py-3 px-3.5 font-extrabold text-navy-900">{row.name}</td>
                      <td className="py-3 px-3.5 text-navy-600">{row.desg}</td>
                      <td className="py-3 px-3.5 text-navy-700">{row.place || '—'}</td>
                      <td className="py-3 px-3.5 font-mono text-navy-600">{filterDate}</td>
                      <td className="py-3 px-3.5 font-mono text-navy-900 font-bold">{row.in}</td>
                      <td className="py-3 px-3.5 text-navy-600">
                        {row.loc !== '—' ? (
                          <div>
                            <div>{row.loc}</div>
                            <span className="text-blue-600 hover:underline text-[10px] font-bold cursor-pointer">
                              View on Map
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-navy-900">{row.out}</td>
                      <td className="py-3 px-3.5 text-navy-400">—</td>
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

  if (selectedReport === 'daily-abstract') {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-navy-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="hover:text-purple-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span>›</span>
              <span className="text-navy-700">Daily Attendance Abstract</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900 uppercase">
              DAILY ATTENDANCE ABSTRACT
            </h1>
            <p className="text-xs text-navy-500 font-medium">District-level daily attendance rollup</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back to Reports</span>
          </button>
        </div>

        {/* Notice alert banner */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-xl font-medium">
          <strong>Notice:</strong> Replaces: District Wise Attendance Count, Daily Abstract Report, Late/Early Leaving/Not Logged Out Abstracts, District Wise Attendance Abstract With Time Count.
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Institution Type</label>
              <select
                value={filterInstType}
                onChange={(e) => setFilterInstType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
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
              <label className="block text-[11px] font-bold text-navy-600 mb-1">District</label>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Place of Working</label>
              <select
                value={filterPlace}
                onChange={(e) => setFilterPlace(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicPlacesList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-medium text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-navy-50">
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
                setFilterDistrict('All Districts');
                setFilterPlace('All Places');
                setFilterInstType('All Types');
                setSearchTableQuery('');
              }}
              className="px-4 py-1.5 rounded-xl text-xs font-bold border border-navy-200 text-navy-700 hover:bg-navy-50 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-navy-100 flex items-center justify-between gap-3 bg-navy-50/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-navy-900">Daily Attendance Abstract</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {dynamicDistricts.length} districts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    'Daily_Attendance_Abstract',
                    ['#', 'DISTRICT', 'TOTAL STAFF', 'REGISTERED', 'ATTENDED ON TIME', 'LATE COUNT', 'EARLY LEAVING', 'NOT LOGGED OUT', 'ABSENT', 'LEAVE', 'OD'],
                    dynamicDistricts.map((d, i) => [i + 1, d.name, d.total, d.registered, d.attended, d.late, d.early, d.notOut, d.absent, d.leave, d.od])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
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
              <thead className="bg-navy-50/70 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">DISTRICT</th>
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
              <tbody className="divide-y divide-navy-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-navy-400 font-medium">
                      No district rollup records found.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-3.5 text-navy-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-extrabold text-navy-900">{row.name}</td>
                      <td className="py-3 px-3.5 text-center font-mono">{row.total}</td>
                      <td className="py-3 px-3.5 text-center font-mono text-navy-700">{row.registered}</td>
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

  if (selectedReport === 'attendance-abstract') {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-navy-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="hover:text-purple-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span>›</span>
              <span className="text-navy-700">Attendance Abstract</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900 uppercase">
              ATTENDANCE ABSTRACT
            </h1>
            <p className="text-xs text-navy-500 font-medium">Aggregate attendance stats per district</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back to Reports</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-navy-100 flex items-center justify-between gap-3 bg-navy-50/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-navy-900">Attendance Abstract</span>
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
                    ['NO.', 'DISTRICT', 'TOTAL NO. OF EMPLOYEES', 'USERS REGISTERED', 'MARKED ATTENDANCE'],
                    dynamicDistricts.map((d, i) => [i + 1, d.name, d.total, d.registered, d.attended])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
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
              <thead className="bg-navy-50/70 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3 px-4">NO.</th>
                  <th className="py-3 px-4">DISTRICT</th>
                  <th className="py-3 px-4 text-center">TOTAL NO. OF EMPLOYEES</th>
                  <th className="py-3 px-4 text-center">USERS REGISTERED</th>
                  <th className="py-3 px-4 text-center text-emerald-700">MARKED ATTENDANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-navy-400 font-medium">
                      No district attendance data recorded.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3.5 px-4 text-navy-400 font-medium">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-navy-900">{row.name}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-navy-700">{row.total}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-navy-700">{row.registered}</td>
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

  if (selectedReport === 'range-attendance') {
    return (
      <div className="space-y-4 animate-fade-in font-sans text-navy-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="hover:text-purple-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span>›</span>
              <span className="text-navy-700">Range Attendance</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900 uppercase">
              RANGE ATTENDANCE
            </h1>
            <p className="text-xs text-navy-500 font-medium">Report, Detail, and Abstract views across a date range</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back to Reports</span>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-xl font-medium">
          <strong>Notice:</strong> Replaces: Attendance Report (Report tab + Abstract tab) and Detail Employee Attendance Report — now three tabs on one screen, sharing one date-range query.
        </div>

        {/* Filter Toolbar with Range Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">From Date</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">To Date</label>
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">District</label>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-bold text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              >
                {dynamicDistrictsList.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-navy-200 bg-white font-medium text-navy-800 text-xs focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-navy-50">
            {/* Range Tab Switcher */}
            <div className="bg-navy-50 p-1 rounded-xl flex items-center border border-navy-100 text-xs">
              {(['Report', 'Detail', 'Abstract'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRangeTabMode(tab)}
                  className={cn(
                    'px-4 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer',
                    rangeTabMode === tab
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-navy-600 hover:text-navy-900'
                  )}
                >
                  {tab}
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
                  setFilterDistrict('All Districts');
                  setSearchTableQuery('');
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold border border-navy-200 text-navy-700 hover:bg-navy-50 transition cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    'Range_Attendance_Report',
                    ['#', 'EMPLOYEE NO', 'NAME', 'DISTRICT', 'PLACE OF WORKING', 'PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'TOTAL', 'ATTENDANCE %'],
                    filteredDailyAttendance.map((r, i) => [i + 1, r.id, r.name, r.dist, r.place, r.status === 'Present' ? 1 : 0, r.status === 'Late' ? 1 : 0, r.status === 'Absent' ? 1 : 0, r.status === 'Leave' ? 1 : 0, 1, r.status === 'Absent' ? '0%' : '100%'])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-navy-100 bg-navy-50/40 flex items-center justify-between">
            <div className="text-xs font-extrabold text-navy-900">
              Report — Employee Totals, {filterFromDate} to {filterToDate}{' '}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono">
                {filteredDailyAttendance.length} records
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50/70 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3 px-3.5">#</th>
                  <th className="py-3 px-3.5">EMPLOYEE NO</th>
                  <th className="py-3 px-3.5">NAME</th>
                  <th className="py-3 px-3.5">DISTRICT</th>
                  <th className="py-3 px-3.5">PLACE OF WORKING</th>
                  <th className="py-3 px-3.5 text-center text-emerald-700">PRESENT</th>
                  <th className="py-3 px-3.5 text-center text-amber-700">LATE</th>
                  <th className="py-3 px-3.5 text-center text-rose-700">ABSENT</th>
                  <th className="py-3 px-3.5 text-center text-purple-700">LEAVE</th>
                  <th className="py-3 px-3.5 text-center">TOTAL</th>
                  <th className="py-3 px-3.5 text-center">ATTENDANCE %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 font-medium">
                {filteredDailyAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-navy-400 font-medium">
                      No range attendance records found.
                    </td>
                  </tr>
                ) : (
                  filteredDailyAttendance.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-3.5 text-navy-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3.5 font-mono text-navy-700 font-bold">{row.id}</td>
                      <td className="py-3 px-3.5 font-extrabold text-navy-900">{row.name}</td>
                      <td className="py-3 px-3.5 text-navy-700 font-bold">{row.dist}</td>
                      <td className="py-3 px-3.5 text-navy-600">{row.place}</td>
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
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-navy-900">1</td>
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
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GENERIC DRILLDOWN SUBVIEW (For remaining cards)
  // ─────────────────────────────────────────────────────────────────────────────

  if (selectedReport) {
    const activeConfig =
      [...combinedAttendanceCards, ...dailyAbstractCards, ...hrmsAnalyticsCards].find((c) => c.id === selectedReport) ||
      combinedAttendanceCards[0];

    return (
      <div className="space-y-4 animate-fade-in font-sans text-navy-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="hover:text-purple-600 hover:underline cursor-pointer"
              >
                Reports
              </button>
              <span>›</span>
              <span className="text-navy-700">{activeConfig.title}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-navy-900 uppercase">
              {activeConfig.title}
            </h1>
            <p className="text-xs text-navy-500 font-medium">{activeConfig.description}</p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-navy-200 bg-white hover:bg-navy-50 text-navy-700 flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
            <span>Back to Reports</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-100 pb-3">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center font-bold', activeConfig.iconBg)}>
                <Icon name={activeConfig.icon} size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-navy-900">{activeConfig.title} Overview</h3>
                <p className="text-xs text-navy-500">{activeConfig.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleExportCSV(
                    activeConfig.title.replace(/\s+/g, '_'),
                    ['DISTRICT', 'METRIC', 'VALUE', 'DATE'],
                    dynamicDistricts.map((d) => [d.name, activeConfig.title, d.total, filterDate])
                  )
                }
                className="px-3 py-1.5 rounded-xl text-xs font-bold border border-navy-200 hover:bg-navy-50 text-navy-700 flex items-center gap-1 cursor-pointer"
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
              <thead className="bg-navy-50/70 text-navy-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">District / Unit</th>
                  <th className="py-3 px-4 text-center">Total Staff</th>
                  <th className="py-3 px-4 text-center text-emerald-700">Compliant Count</th>
                  <th className="py-3 px-4 text-center text-amber-700">Pending Review</th>
                  <th className="py-3 px-4 text-center text-rose-700">Flagged Exceptions</th>
                  <th className="py-3 px-4 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 font-bold">
                {dynamicDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-navy-400 font-medium">
                      No operational unit records found.
                    </td>
                  </tr>
                ) : (
                  dynamicDistricts.map((d, i) => (
                    <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-4 text-navy-400 font-medium">{i + 1}</td>
                      <td className="py-3 px-4 font-extrabold text-navy-900">{d.name}</td>
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
  // MAIN REPORTS HUB / DIRECTORY (Matching User Screenshot 1)
  // ─────────────────────────────────────────────────────────────────────────────

  const renderCard = (card: ReportCardConfig) => (
    <div
      key={card.id}
      onClick={() => setSelectedReport(card.id)}
      className="bg-white rounded-2xl p-5 border border-navy-100/90 shadow-2xs hover:shadow-md hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 flex flex-col items-center text-center cursor-pointer group relative overflow-hidden"
    >
      {/* Top soft icon with 3D aesthetic container */}
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs transition-transform group-hover:scale-105',
          card.iconBg
        )}
      >
        <Icon name={card.icon} size={26} className={card.iconColor} />
      </div>

      <h3 className="text-sm font-extrabold text-navy-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">
        {card.title}
      </h3>
      <p className="text-[11px] text-navy-400 font-medium leading-relaxed max-w-[220px]">
        {card.description}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in font-sans text-navy-900">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs text-navy-400 font-bold mb-1 flex items-center gap-1.5">
            <span>Home</span>
            <span>›</span>
            <span className="text-navy-700">Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            Reports
          </h1>
          <p className="text-xs text-navy-500 font-medium mt-0.5">
            District-level analytics, exportable reports and progress tracking
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            placeholder="Search report modules..."
            value={searchReportDirectory}
            onChange={(e) => setSearchReportDirectory(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white border border-navy-200 text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-2xs"
          />
        </div>
      </div>

      {/* SECTION 1: Combined Attendance Reports */}
      <div className="space-y-3.5">
        <div className="flex items-center gap-2 text-sm font-extrabold text-blue-700">
          <span className="text-base">📁</span>
          <span>Combined Attendance Reports</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {combinedAttendanceCards
            .filter((c) => !searchReportDirectory.trim() || c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) || c.description.toLowerCase().includes(searchReportDirectory.toLowerCase()))
            .map(renderCard)}
        </div>
      </div>

      {/* SECTION 2: Daily Abstracts */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-700">
          <span className="text-base">📊</span>
          <span>Daily Abstracts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {dailyAbstractCards
            .filter((c) => !searchReportDirectory.trim() || c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) || c.description.toLowerCase().includes(searchReportDirectory.toLowerCase()))
            .map(renderCard)}
        </div>
      </div>

      {/* SECTION 3: HRMS & Performance Analytics */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-purple-700">
          <span className="text-base">📈</span>
          <span>HRMS &amp; Performance Analytics</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {hrmsAnalyticsCards
            .filter((c) => !searchReportDirectory.trim() || c.title.toLowerCase().includes(searchReportDirectory.toLowerCase()) || c.description.toLowerCase().includes(searchReportDirectory.toLowerCase()))
            .map(renderCard)}
        </div>
      </div>
    </div>
  );
}
