import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { TimePickerSelect } from '@/components/ui/TimePickerSelect';
import { cn } from '@/utils/cn';
import {
  hrmsApi,
  type AttendanceMatrixResponse,
  type EmployeeMatrixRow,
} from '@/services/hrmsApi';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Pre-computed 15-minute interval time options formatted with AM / PM (e.g. 09:00 AM, 06:00 PM)
const TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const hStr = String(displayH).padStart(2, '0');
    for (const m of ['00', '15', '30', '45']) {
      options.push(`${hStr}:${m} ${period}`);
    }
  }
  return options;
})();

interface HrmsAttendanceTabProps {
  onSuccessToast?: (msg: string) => void;
  scope?: 'employee' | 'student';
}

export function HrmsAttendanceTab({ onSuccessToast, scope }: HrmsAttendanceTabProps) {
  // Attendance Scope Filter: Employee vs Student
  const [attendanceScope, setAttendanceScope] = useState<'employee' | 'student'>(scope || 'employee');

  useEffect(() => {
    if (scope) {
      setAttendanceScope(scope);
    }
  }, [scope]);

  // Month & Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>(() => {
    return localStorage.getItem('vahd_selected_org_id') || 'all';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Synchronize with Topbar organization / branch selector
  useEffect(() => {
    const handleOrgChanged = (e: any) => {
      const orgId = e?.detail?.id ?? localStorage.getItem('vahd_selected_org_id') ?? 'all';
      setSelectedBranch(orgId);
    };
    window.addEventListener('vahd:org_changed', handleOrgChanged);
    return () => window.removeEventListener('vahd:org_changed', handleOrgChanged);
  }, []);

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [matrixData, setMatrixData] = useState<AttendanceMatrixResponse | null>(null);

  // Manual Punch / Adjustment Modal (Matching Image 2)
  const [showPunchModal, setShowPunchModal] = useState<boolean>(false);
  const [punchEmployeeId, setPunchEmployeeId] = useState<string>('');
  const [punchEmployeeName, setPunchEmployeeName] = useState<string>('');
  const [punchDate, setPunchDate] = useState<string>('');
  const [punchAction, setPunchAction] = useState<string>('CHECK_IN');
  const [punchStatus, setPunchStatus] = useState<string>('Present');
  const [punchTime, setPunchTime] = useState<string>('');
  const [punchCheckOutTime, setPunchCheckOutTime] = useState<string>('');
  const [punchMethod, setPunchMethod] = useState<string>('Manual Entry');
  const [punchNote, setPunchNote] = useState<string>('');
  const [submittingPunch, setSubmittingPunch] = useState<boolean>(false);

  // Available Time Options including current selection if custom
  const availableCheckInOptions = useMemo(() => {
    if (punchTime && !TIME_OPTIONS.includes(punchTime)) {
      return [punchTime, ...TIME_OPTIONS];
    }
    return TIME_OPTIONS;
  }, [punchTime]);

  const availableCheckOutOptions = useMemo(() => {
    if (punchCheckOutTime && !TIME_OPTIONS.includes(punchCheckOutTime)) {
      return [punchCheckOutTime, ...TIME_OPTIONS];
    }
    return TIME_OPTIONS;
  }, [punchCheckOutTime]);

  const showToast = (msg: string) => {
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Fetch Matrix Data
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const branchId = selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined;
      const res = await hrmsApi.getAttendanceMatrix({
        year: selectedYear,
        month: selectedMonth,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        search: searchQuery.trim() || undefined,
        user_type: attendanceScope,
        branch_id: branchId,
      });
      setMatrixData(res);
    } catch (e) {
      console.error('Failed to load attendance matrix:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedYear, selectedMonth, selectedDepartment, attendanceScope, selectedBranch]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttendance();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // Open manual punch for single cell
  const handleCellClick = (emp: EmployeeMatrixRow, dayNum: number) => {
    const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setPunchEmployeeId(emp.id);
    setPunchEmployeeName(emp.name);
    setPunchDate(dayStr);
    const cell = emp.days[String(dayNum)];
    const cellCode = cell?.code;
    const initialStatus =
      cellCode === 'P'
        ? 'Present'
        : cellCode === 'A'
        ? 'Absent'
        : cellCode === 'HD'
        ? 'Half Day'
        : cellCode === 'PL'
        ? 'Paid Leave'
        : cellCode === 'HOL'
        ? 'Holiday'
        : cellCode === 'WO'
        ? 'Week Off'
        : 'Present';
    setPunchStatus(initialStatus);
    setPunchAction(initialStatus === 'Absent' ? 'MARK_ABSENT' : initialStatus === 'Week Off' ? 'WEEK_OFF' : 'CHECK_IN');
    // Real live dynamic times from database via backend (no hardcoded default times)
    setPunchTime(cell?.check_in || '');
    setPunchCheckOutTime(cell?.check_out || '');
    setPunchMethod(cell?.method || 'Manual Entry');
    setPunchNote(initialStatus);
    setShowPunchModal(true);
  };

  // Submit Manual Punch / Status Update (Two-way dynamic sync)
  const handleSubmitPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchEmployeeId || !punchDate) {
      showToast('Person and Date are required.');
      return;
    }
    setSubmittingPunch(true);
    try {
      const isOffStatus = punchStatus === 'Absent' || punchStatus === 'Week Off' || punchStatus === 'Holiday';
      const action =
        punchStatus === 'Absent'
          ? 'MARK_ABSENT'
          : punchStatus === 'Holiday'
          ? 'HOLIDAY'
          : punchStatus === 'Half Day'
          ? 'HALF_DAY'
          : punchStatus === 'Paid Leave'
          ? 'LEAVE'
          : punchStatus === 'Week Off'
          ? 'WEEK_OFF'
          : 'CHECK_IN';

      await hrmsApi.punchAttendance({
        employee_id: punchEmployeeId,
        action: action,
        status: punchStatus,
        date: punchDate,
        time: isOffStatus ? undefined : (punchTime.trim() || undefined),
        check_out_time: isOffStatus ? undefined : (punchCheckOutTime.trim() || undefined),
        note: punchNote.trim() || undefined,
        method: punchMethod,
        user_role: attendanceScope,
      });

      showToast(`Recorded ${punchStatus} for ${punchEmployeeName || 'Profile'} on ${punchDate}.`);
      setShowPunchModal(false);

      const parts = punchDate.split('-');
      if (parts.length === 3) {
        const pYear = parseInt(parts[0], 10);
        const pMonth = parseInt(parts[1], 10);
        if (pYear !== selectedYear || pMonth !== selectedMonth) {
          setSelectedYear(pYear);
          setSelectedMonth(pMonth);
        } else {
          fetchAttendance();
        }
      } else {
        fetchAttendance();
      }
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to submit punch.');
    } finally {
      setSubmittingPunch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER SECTION (Monthly Matrix & Scope Selector)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {attendanceScope === 'student' ? 'Student Attendance' : 'Daily Attendance'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {attendanceScope === 'student'
              ? 'Student timesheets log summary, interactive monthly calendar matrix, and attendance tracking.'
              : 'Timesheets log summary, interactive monthly calendar matrix, and dynamic administrative punches.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Scope indicator or selector - Hidden when already scoped in Students View or Employees View */}
          {!scope && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-slate-400 pl-2">
                Scope:
              </span>
              <select
                value={attendanceScope}
                onChange={(e) => {
                  setAttendanceScope(e.target.value as 'employee' | 'student');
                  setSelectedDepartment('ALL');
                  setSearchQuery('');
                }}
                className="bg-white text-purple-700 px-3 py-1.5 rounded-lg text-xs font-black border-0 shadow-xs focus:outline-none cursor-pointer hover:bg-purple-50 transition"
              >
                <option value="employee">👨‍💼 Employees Attendance</option>
                <option value="student">🎓 Students Attendance</option>
              </select>
            </div>
          )}

          {/* Manual Punch Action Button */}
          <button
            type="button"
            onClick={() => {
              if (matrixData && matrixData.employees.length > 0) {
                setPunchEmployeeId(matrixData.employees[0].id);
                setPunchEmployeeName(matrixData.employees[0].name);
              } else {
                setPunchEmployeeId('');
                setPunchEmployeeName('');
              }
              const now = new Date();
              const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);
              if (isCurrentMonth) {
                setPunchDate(now.toISOString().split('T')[0]);
              } else {
                setPunchDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
              }
              setPunchStatus('Present');
              setPunchAction('CHECK_IN');
              setPunchTime('');
              setPunchCheckOutTime('');
              setPunchMethod('Manual Entry');
              setPunchNote('Present');
              setShowPunchModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition cursor-pointer"
          >
            <Icon name="plus" size={13} />
            <span>{attendanceScope === 'student' ? 'Manual Student Punch / Mark Date' : 'Manual Punch / Mark Date'}</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 5 METRIC STAT CARDS (Matching Screenshot 2)                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: PRESENT TODAY */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 shadow-2xs text-center flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
            {matrixData?.summary?.present_today ?? 0}
          </div>
          <div className="text-[11px] font-black uppercase text-emerald-800 tracking-wider mt-1">
            PRESENT TODAY
          </div>
        </div>

        {/* Card 2: ABSENT */}
        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 shadow-2xs text-center flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-black text-rose-600 tracking-tight">
            {matrixData?.summary?.absent ?? 0}
          </div>
          <div className="text-[11px] font-black uppercase text-rose-800 tracking-wider mt-1">
            ABSENT
          </div>
        </div>

        {/* Card 3: ON LEAVE */}
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 shadow-2xs text-center flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-black text-purple-600 tracking-tight">
            {matrixData?.summary?.on_leave ?? 0}
          </div>
          <div className="text-[11px] font-black uppercase text-purple-800 tracking-wider mt-1">
            ON LEAVE
          </div>
        </div>

        {/* Card 4: AVG ATTENDANCE */}
        <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200/80 shadow-2xs text-center flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-black text-cyan-600 tracking-tight">
            {matrixData?.summary?.avg_attendance_pct ?? 0}%
          </div>
          <div className="text-[11px] font-black uppercase text-cyan-800 tracking-wider mt-1">
            AVG ATTENDANCE
          </div>
        </div>

        {/* Card 5: TOTAL PROFILES */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs text-center flex flex-col justify-center">
          <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {matrixData?.summary?.total_profiles ?? 0}
          </div>
          <div className="text-[11px] font-black uppercase text-slate-600 tracking-wider mt-1">
            TOTAL PROFILES
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. MONTH SELECTOR & FILTER TOOLBAR (Matching Screenshot 2)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
        {/* Left: Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <Icon name="chevron-left" size={14} />
          </button>

          <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent font-black text-xs text-slate-900 focus:outline-none cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-black text-xs text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 cursor-pointer"
          >
            <Icon name="chevron-right" size={14} />
          </button>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer ml-1"
          >
            Current Month
          </button>
        </div>

        {/* Right: Search Filter & Department Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px]">
            <Icon
              name="search"
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                attendanceScope === 'student'
                  ? 'Filter student by name, roll no...'
                  : 'Filter employee...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">
              All {attendanceScope === 'student' ? 'Courses' : 'Departments'} ({matrixData?.departments?.length ?? 0})
            </option>
            {(matrixData?.departments || []).map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchAttendance}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer"
            title="Refresh Attendance"
          >
            <Icon name="refresh-cw" size={13} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MONTHLY ATTENDANCE MATRIX (Dynamic Two-Way Grid)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Header Row */}
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 min-w-[200px] border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                  {attendanceScope === 'student' ? 'STUDENT' : 'EMPLOYEE'}
                </th>
                <th className="py-3 px-2 text-center w-10 text-emerald-700 bg-emerald-50/40 border-r border-slate-200">
                  P
                </th>
                <th className="py-3 px-2 text-center w-10 text-rose-700 bg-rose-50/40 border-r border-slate-200">
                  A
                </th>
                <th className="py-3 px-2 text-center w-10 text-purple-700 bg-purple-50/40 border-r border-slate-200">
                  PL
                </th>
                {attendanceScope !== 'student' && (
                  <th className="py-3 px-3 text-center min-w-[70px] text-slate-800 bg-slate-100/60 border-r border-slate-200">
                    Payable
                  </th>
                )}

                {/* Days 1 to 30/31 Header */}
                {(matrixData?.days_in_month || []).map((d) => (
                  <th
                    key={d.day}
                    className={cn(
                      'py-2 px-1 text-center min-w-[36px] border-r border-slate-100',
                      d.is_today && 'bg-purple-100/50 text-purple-900'
                    )}
                  >
                    <div className="text-[11px] font-black">{d.day}</div>
                    <div className="text-[9px] font-bold text-slate-400 -mt-0.5">{d.day_letter}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body Rows */}
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={(matrixData?.days_in_month?.length ?? 30) + (attendanceScope === 'student' ? 4 : 5)}
                    className="py-12 text-center text-slate-400 font-bold"
                  >
                    Loading attendance matrix...
                  </td>
                </tr>
              ) : !matrixData?.employees || matrixData.employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={(matrixData?.days_in_month?.length ?? 30) + (attendanceScope === 'student' ? 4 : 5)}
                    className="py-12 text-center text-slate-400 font-bold"
                  >
                    No {attendanceScope === 'student' ? 'students' : 'employees'} found for this filter.
                  </td>
                </tr>
              ) : (
                matrixData.employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition group">
                    {/* Sticky Profile */}
                    <td className="py-3 px-4 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 transition z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                          {emp.initials || (emp.designation === 'Student' || attendanceScope === 'student' ? 'ST' : 'EM')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs truncate">
                            {emp.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold truncate">
                            {emp.code} · {emp.department} {emp.designation && emp.designation !== 'Student' ? `· ${emp.designation}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Counts: P, A, PL, Payable */}
                    <td className="py-2.5 px-2 text-center font-black text-emerald-600 bg-emerald-50/20 border-r border-slate-200 text-xs">
                      {emp.present_count}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-rose-600 bg-rose-50/20 border-r border-slate-200 text-xs">
                      {emp.absent_count}
                    </td>
                    <td className="py-2.5 px-2 text-center font-black text-purple-600 bg-purple-50/20 border-r border-slate-200 text-xs">
                      {emp.leave_count}
                    </td>
                    {attendanceScope !== 'student' && (
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50/40 border-r border-slate-200 text-xs">
                        {emp.payable_days}
                      </td>
                    )}

                    {/* Day Cells 1 to 30 */}
                    {(matrixData.days_in_month || []).map((d) => {
                      const cell = emp.days[String(d.day)];
                      const code = cell?.code || '-';

                      return (
                        <td
                          key={d.day}
                          onClick={() => handleCellClick(emp, d.day)}
                          className={cn(
                            'py-2 px-1 text-center border-r border-slate-100 cursor-pointer transition hover:scale-105 select-none',
                            d.is_today && 'bg-purple-50/30'
                          )}
                          title={`${emp.name} - ${d.formatted}: ${cell?.status_label || code}${cell?.check_in ? ` (In: ${cell.check_in})` : ''} - Click to mark attendance`}
                        >
                          {code === 'WO' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-sky-700 bg-sky-100/80">
                              WO
                            </span>
                          ) : code === 'HOL' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-amber-800 bg-amber-100">
                              HOL
                            </span>
                          ) : code === 'P' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-emerald-800 bg-emerald-100">
                              P
                            </span>
                          ) : code === 'HD' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-amber-800 bg-amber-100">
                              HD
                            </span>
                          ) : code === 'PL' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-purple-800 bg-purple-100">
                              PL
                            </span>
                          ) : code === 'A' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-black text-rose-800 bg-rose-100">
                              A
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: MANUAL TIMESHEET PUNCH / ADJUSTMENT (Image 2)       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Icon name="clock" size={17} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {attendanceScope === 'student' ? 'Manual Student Attendance Punch / Adjustment' : 'Manual Timesheet Punch / Adjustment'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPunchModal(false)}
                className="w-7 h-7 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmitPunch} className="space-y-4">
              {/* Field 1: Choose Employee / Student Profile */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  {attendanceScope === 'student' ? 'CHOOSE STUDENT PROFILE *' : 'CHOOSE EMPLOYEE PROFILE *'}
                </label>
                <select
                  required
                  value={punchEmployeeId}
                  onChange={(e) => {
                    setPunchEmployeeId(e.target.value);
                    const matched = matrixData?.employees.find((emp) => emp.id === e.target.value);
                    if (matched) setPunchEmployeeName(matched.name);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                >
                  {(matrixData?.employees || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}{emp.code ? ` (${emp.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2 & 3: 2-column Timesheet Date & Attendance Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    TIMESHEET DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={punchDate}
                    onChange={(e) => setPunchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                    ATTENDANCE STATUS
                  </label>
                  <select
                    value={punchStatus}
                    onChange={(e) => {
                      const st = e.target.value;
                      setPunchStatus(st);
                      // Auto-fill reason / administrative notes with selected attendance status by default
                      setPunchNote(st);
                      if (st === 'Absent') {
                        setPunchAction('MARK_ABSENT');
                        setPunchTime('');
                        setPunchCheckOutTime('');
                      } else if (st === 'Half Day') {
                        setPunchAction('HALF_DAY');
                      } else if (st === 'Paid Leave') {
                        setPunchAction('LEAVE');
                        setPunchTime('');
                        setPunchCheckOutTime('');
                      } else if (st === 'Holiday') {
                        setPunchAction('HOLIDAY');
                        setPunchTime('');
                        setPunchCheckOutTime('');
                      } else if (st === 'Week Off') {
                        setPunchAction('WEEK_OFF');
                        setPunchTime('');
                        setPunchCheckOutTime('');
                      } else {
                        setPunchAction('CHECK_IN');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 cursor-pointer"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Paid Leave">Paid Leave</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Week Off">Week Off</option>
                  </select>
                </div>
              </div>

              {/* Field 4 & 5: 2-column Check In Time & Check Out Time (Custom 3-column scrollable TimePickerSelect as per IST) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                      CHECK IN TIME
                    </label>
                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      IST (AM/PM)
                    </span>
                  </div>
                  <TimePickerSelect
                    value={punchTime}
                    onChange={(val) => setPunchTime(val)}
                    disabled={punchStatus === 'Absent' || punchStatus === 'Week Off' || punchStatus === 'Holiday'}
                    placeholder="HH:MM (e.g. 09:00 AM)"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                      CHECK OUT TIME
                    </label>
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                      IST (AM/PM)
                    </span>
                  </div>
                  <TimePickerSelect
                    value={punchCheckOutTime}
                    onChange={(val) => setPunchCheckOutTime(val)}
                    disabled={punchStatus === 'Absent' || punchStatus === 'Week Off' || punchStatus === 'Holiday'}
                    placeholder="HH:MM (e.g. 06:00 PM)"
                  />
                </div>
              </div>

              {/* Field 6: Punch Method */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  PUNCH METHOD
                </label>
                <select
                  value={punchMethod}
                  onChange={(e) => setPunchMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                >
                  <option value="Manual Entry">Manual Entry</option>
                  <option value="Manual Entry (HR Verified)">Manual Entry (HR Verified)</option>
                  <option value="Biometric Terminal">Biometric Terminal</option>
                  <option value="Face Recognition ESS">Face Recognition ESS</option>
                  <option value="GPS Mobile Check-In">GPS Mobile Check-In</option>
                  <option value="System Admin Override">System Admin Override</option>
                </select>
              </div>

              {/* Field 7: Administrative Notes / Reason */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider block">
                  ADMINISTRATIVE NOTES / REASON
                </label>
                <input
                  type="text"
                  value={punchNote}
                  onChange={(e) => setPunchNote(e.target.value)}
                  placeholder="Enter administrative notes or reason..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPunchModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPunch}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-md shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPunch ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
