import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
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

interface HrmsAttendanceTabProps {
  onSuccessToast?: (msg: string) => void;
}

export function HrmsAttendanceTab({ onSuccessToast }: HrmsAttendanceTabProps) {
  // Navigation / View Tabs
  const [viewMode, setViewMode] = useState<'matrix' | 'table' | 'calendar'>('matrix');

  // Month & Year state
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Data
  const [loading, setLoading] = useState<boolean>(true);
  const [matrixData, setMatrixData] = useState<AttendanceMatrixResponse | null>(null);

  // Manual Punch / Mark Date Modal
  const [showPunchModal, setShowPunchModal] = useState<boolean>(false);
  const [punchEmployeeId, setPunchEmployeeId] = useState<string>('');
  const [punchEmployeeName, setPunchEmployeeName] = useState<string>('');
  const [punchDate, setPunchDate] = useState<string>('');
  const [punchAction, setPunchAction] = useState<string>('CHECK_IN');
  const [punchTime, setPunchTime] = useState<string>('09:00');
  const [punchNote, setPunchNote] = useState<string>('');
  const [submittingPunch, setSubmittingPunch] = useState<boolean>(false);

  const showToast = (msg: string) => {
    if (onSuccessToast) onSuccessToast(msg);
  };

  // Fetch Matrix Data
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await hrmsApi.getAttendanceMatrix({
        year: selectedYear,
        month: selectedMonth,
        department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        search: searchQuery.trim() || undefined,
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
  }, [selectedYear, selectedMonth, selectedDepartment]);

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
    setPunchAction('CHECK_IN');
    setPunchTime('09:00');
    setPunchNote('Manual Administrative Entry');
    setShowPunchModal(true);
  };

  // Submit Manual Punch
  const handleSubmitPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchEmployeeId || !punchDate) {
      showToast('Employee and Date are required.');
      return;
    }
    setSubmittingPunch(true);
    try {
      await hrmsApi.punchAttendance({
        employee_id: punchEmployeeId,
        action: punchAction,
        date: punchDate,
        time: punchTime,
        note: punchNote.trim() || `Manual punch (${punchAction}) by Administrator`,
        method: 'MANUAL',
      });
      showToast(`Recorded punch for ${punchEmployeeName || 'Employee'} on ${punchDate}.`);
      setShowPunchModal(false);
      fetchAttendance();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to submit punch.');
    } finally {
      setSubmittingPunch(false);
    }
  };

  // Flattened logs for Table View
  const tableLogs = useMemo(() => {
    if (!matrixData) return [];
    const logs: Array<{
      key: string;
      date: string;
      employeeName: string;
      employeeCode: string;
      department: string;
      status: string;
      checkIn: string;
      checkOut: string;
      workHours: string;
    }> = [];

    matrixData.employees.forEach((emp) => {
      Object.entries(emp.days).forEach(([dayNum, dayInfo]) => {
        if (dayInfo.code !== '-' && dayInfo.code !== 'WO') {
          logs.push({
            key: `${emp.id}_${dayInfo.date}`,
            date: dayInfo.date,
            employeeName: emp.name,
            employeeCode: emp.code,
            department: emp.department,
            status: dayInfo.status_label,
            checkIn: dayInfo.check_in || '--:--',
            checkOut: dayInfo.check_out || '--:--',
            workHours: dayInfo.work_hours ? `${dayInfo.work_hours} hrs` : '--',
          });
        }
      });
    });

    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [matrixData]);

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. HEADER SECTION (Matching Screenshot 2)                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Daily Attendance
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Timesheets log summary, interactive calendar grid, manual administrative punches, and WFH tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Switch Buttons Pill */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'matrix'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon name="grid" size={13} />
              <span>Monthly Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'table'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon name="list" size={13} />
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                viewMode === 'calendar'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Icon name="calendar" size={13} />
              <span>Calendar View</span>
            </button>
          </div>

          {/* Manual Punch Action Button */}
          <button
            type="button"
            onClick={() => {
              if (matrixData && matrixData.employees.length > 0) {
                setPunchEmployeeId(matrixData.employees[0].id);
                setPunchEmployeeName(matrixData.employees[0].name);
              }
              const now = new Date();
              setPunchDate(now.toISOString().split('T')[0]);
              setPunchAction('CHECK_IN');
              setPunchTime('09:00');
              setPunchNote('Manual Administrative Punch');
              setShowPunchModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/25 transition cursor-pointer"
          >
            <Icon name="plus" size={13} />
            <span>Manual Punch / Mark Date</span>
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

        {/* Right: Employee Filter & Department Dropdown */}
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
              placeholder="Filter employee..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">
              All Departments ({matrixData?.departments?.length ?? 0})
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
      {/* 4. MAIN ATTENDANCE VIEWS                                      */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* VIEW A: MONTHLY MATRIX (Matching Screenshot 2) */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Row */}
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 min-w-[200px] border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                    Employee
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
                  <th className="py-3 px-3 text-center min-w-[70px] text-slate-800 bg-slate-100/60 border-r border-slate-200">
                    Payable
                  </th>

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
                      colSpan={(matrixData?.days_in_month?.length ?? 30) + 5}
                      className="py-12 text-center text-slate-400 font-bold"
                    >
                      Loading attendance matrix...
                    </td>
                  </tr>
                ) : !matrixData?.employees || matrixData.employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(matrixData?.days_in_month?.length ?? 30) + 5}
                      className="py-12 text-center text-slate-400 font-bold"
                    >
                      No employees found for this filter.
                    </td>
                  </tr>
                ) : (
                  matrixData.employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition group">
                      {/* Sticky Employee Profile */}
                      <td className="py-3 px-4 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 transition z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {emp.initials || 'EM'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-xs truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold truncate">
                              {emp.code} · {emp.department}
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
                      <td className="py-2.5 px-3 text-center font-black text-slate-900 bg-slate-50/40 border-r border-slate-200 text-xs">
                        {emp.payable_days}
                      </td>

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
                            title={`${emp.name} - ${d.formatted}: ${cell?.status_label || code}${cell?.check_in ? ` (In: ${cell.check_in})` : ''} - Click to punch/edit`}
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
      )}

      {/* VIEW B: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              Showing {tableLogs.length} attendance records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Work Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      No attendance log records found.
                    </td>
                  </tr>
                ) : (
                  tableLogs.map((log) => (
                    <tr key={log.key} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{log.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900">{log.employeeName}</div>
                        <div className="text-[10px] text-slate-400">{log.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">{log.department}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{log.checkIn}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{log.checkOut}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{log.workHours}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
                            log.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'Late'
                              ? 'bg-amber-100 text-amber-800'
                              : log.status === 'Holiday'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Attendance Calendar
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {matrixData?.employees?.length ?? 0} active employees
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-black text-slate-400 uppercase py-2"
              >
                {d}
              </div>
            ))}

            {(matrixData?.days_in_month || []).map((d) => (
              <div
                key={d.day}
                className={cn(
                  'p-2.5 rounded-2xl border min-h-[75px] flex flex-col justify-between transition hover:shadow-sm',
                  d.is_today
                    ? 'border-purple-500 bg-purple-50/30'
                    : 'border-slate-200/80 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-xs font-black',
                      d.is_today ? 'text-purple-700' : 'text-slate-800'
                    )}
                  >
                    {d.day}
                  </span>
                  <span className="text-[10px] text-slate-400">{d.day_letter}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-1">
                  {matrixData?.summary ? (
                    <span className="text-emerald-600 font-extrabold">Active Day</span>
                  ) : (
                    '-'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MANUAL PUNCH / MARK DATE MODAL                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPunchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  <Icon name="clock" size={16} />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Manual Punch / Mark Date
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPunchModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPunch} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Staff Member *</label>
                <select
                  value={punchEmployeeId}
                  onChange={(e) => {
                    setPunchEmployeeId(e.target.value);
                    const matched = matrixData?.employees.find((emp) => emp.id === e.target.value);
                    if (matched) setPunchEmployeeName(matched.name);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                >
                  {(matrixData?.employees || []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code} · {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={punchDate}
                    onChange={(e) => setPunchDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Punch Action</label>
                  <select
                    value={punchAction}
                    onChange={(e) => setPunchAction(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="CHECK_IN">Check In (Present)</option>
                    <option value="CHECK_OUT">Check Out</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ABSENT">Mark Absent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Punch Time (HH:MM)</label>
                <input
                  type="time"
                  value={punchTime}
                  onChange={(e) => setPunchTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Reason / Notes</label>
                <input
                  type="text"
                  value={punchNote}
                  onChange={(e) => setPunchNote(e.target.value)}
                  placeholder="Administrative manual punch reason"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPunchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPunch}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPunch ? 'Saving...' : 'Record Punch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
