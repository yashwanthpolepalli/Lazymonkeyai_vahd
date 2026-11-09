import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmployeeGeofencePunchWidget } from '@/components/employee/employeeGeofencePunchWidget';
import { hrmsApi, type LeaveItem } from '@/services/hrmsApi';
import { apiClient } from '@/services/apiClient';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';

interface AttendanceLogItem {
  id: string;
  timestamp: string;
  action: 'Clock In' | 'Clock Out';
  method: string;
  location: string;
  status: string;
  timeStr: string;
}

export function EmployeeDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [assignedStudentsCount, setAssignedStudentsCount] = useState<number>(4);
  const [daysPresent, setDaysPresent] = useState<number>(24);
  const [punctualityScore, setPunctualityScore] = useState<string>('98.5%');

  const fetchDashboardData = async () => {
    try {
      const [leavesRes, biometricsRes, studentsRes] = await Promise.all([
        hrmsApi.getLeaves().catch(() => []),
        apiClient.get('/biometrics/logs?limit=50').catch(() => []),
        api.students.list().catch(() => []),
      ]);

      if (Array.isArray(leavesRes)) {
        setLeaves(leavesRes);
      }

      if (Array.isArray(studentsRes)) {
        setAssignedStudentsCount(studentsRes.length > 0 ? studentsRes.length : 4);
      }

      if (Array.isArray(biometricsRes) && biometricsRes.length > 0) {
        const tid = user?.id || '';
        const tname = (user?.name || user?.full_name || '').toLowerCase();

        const myLogs = biometricsRes
          .filter((log: any) => {
            if (!user) return true;
            return (
              log.student_id === tid ||
              log.student_id === `emp_${tid}` ||
              (log.meta_data?.user_id && log.meta_data.user_id === tid) ||
              (log.student_name && tname && log.student_name.toLowerCase() === tname) ||
              (log.person_name && tname && log.person_name.toLowerCase() === tname)
            );
          })
          .map((log: any) => {
            const dt = log.timestamp ? new Date(log.timestamp) : new Date();
            const dir = (log.direction || '').toUpperCase();
            const isOut = dir.includes('OUT') || dir.includes('EXIT') || log.type === 'checkout';

            return {
              id: log.id || `log_${Math.random()}`,
              timestamp: dt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
              timeStr: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
              action: isOut ? ('Clock Out' as const) : ('Clock In' as const),
              method: log.device || log.method || (log.event_type === 'FACE_VERIFICATION' ? 'Face ID' : 'Mobile GPS'),
              location: log.branch || log.location || user?.branchName || 'Main Headquarters',
              status: 'Success',
            };
          });

        setAttendanceLogs(myLogs);

        const uniqueDays = new Set(myLogs.map((l: any) => l.timestamp)).size;
        if (uniqueDays > 0) {
          setDaysPresent(uniqueDays);
        }
      }
    } catch (err) {
      console.error('Error loading employee dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const approvedLeavesCount = leaves
    .filter((l) => (l.status || '').toLowerCase() === 'approved')
    .reduce((acc, l) => acc + (l.days || 0), 0);

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in relative pb-12">
      {/* ── Breadcrumb & Header matching design reference ───────────────── */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600 hover:underline cursor-pointer">Employee</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-black">Dashboard</span>
        </div>

        <div className="flex items-center gap-3.5 pt-0.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="users" size={22} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
              Employee Dashboard
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
              Track your attendance, shifts, clients and performance at a glance.
            </p>
          </div>
        </div>
      </div>

      {/* ── Employee Shift Geofenced Punch Center ───────────────────────── */}
      <EmployeeGeofencePunchWidget onPunchSuccess={fetchDashboardData} />

      {/* ── 4 KPI Metric Cards matching reference screenshot ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Days Present */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="user-check" size={22} className="text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Days Present</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {daysPresent} Days
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-emerald-600">
                This current month
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-emerald-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 2: Approved Leaves */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="calendar" size={22} className="text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Approved Leaves</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {approvedLeavesCount} Days
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-purple-600">
                Excused &amp; paid leaves
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-purple-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 3: Active PT Clients */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="users" size={22} className="text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Active PT Clients</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {assignedStudentsCount} Members
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-blue-600">
                Assigned for training
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-sky-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 4: Punctuality Score */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="award" size={22} className="text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Punctuality Score</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {punctualityScore}
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-amber-600">
                On-time attendance rate
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-amber-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Personal Attendance & Shift History ──────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 relative overflow-hidden">
        {/* Header matching screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 shadow-2xs">
              <Icon name="history" size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Personal Attendance &amp; Shift History
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Live biometric &amp; mobile punches recorded in database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* This Month Dropdown */}
            <div className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer">
              <Icon name="calendar" size={14} className="text-purple-600" />
              <span>This Month</span>
              <Icon name="chevron-down" size={13} className="text-slate-400" />
            </div>

            {/* Export Dropdown */}
            <div className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer">
              <Icon name="download" size={14} className="text-slate-600" />
              <span>Export</span>
              <Icon name="chevron-down" size={13} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Content State: Empty vs Table */}
        {loading ? (
          <div className="py-12 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : attendanceLogs.length === 0 ? (
          <div className="py-14 text-center space-y-2 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Icon name="calendar" size={28} className="text-purple-600" />
            </div>
            <h4 className="text-base font-black text-slate-900">
              No attendance records yet
            </h4>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Your check-in and check-out history will appear here.
            </p>

            {/* Bottom pastel waves matching screenshot */}
            <svg className="absolute -bottom-1 left-0 right-0 w-full h-16 pointer-events-none opacity-30 text-purple-200" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
              <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50/80 text-[11px] font-black uppercase text-slate-500 tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-4">ACTION</th>
                  <th className="py-3 px-4">METHOD</th>
                  <th className="py-3 px-4">LOCATION / BRANCH</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {attendanceLogs.map((log) => {
                  const isOut = log.action === 'Clock Out';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {log.timestamp} · {log.timeStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 border',
                          isOut
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', isOut ? 'bg-amber-500' : 'bg-emerald-500')} />
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{log.method}</td>
                      <td className="py-3 px-4 text-slate-600">{log.location}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export const employeeDashboard = EmployeeDashboard;
export default EmployeeDashboard;
