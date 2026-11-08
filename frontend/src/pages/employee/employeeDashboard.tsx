import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { LineChart } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { EmployeeGeofencePunchWidget } from '@/components/employee/employeeGeofencePunchWidget';
import type { KpiCard as KpiType, Member } from '@/types';
import { cn } from '@/utils/cn';

export function EmployeeDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.employeeKpis().catch(() => []),
      api.students.list().catch(() => []),
    ]).then(([k, m]) => {
      setKpis(k);
      setMembers((m || []).slice(0, 6));
      setLoading(false);
    });
  }, []);

  const progressData = members.length > 0
    ? members.map((m) => Number(m.attendance) || 0)
    : [];
  const progressLabels = members.length > 0
    ? members.map((m) => (m.name || 'Member').split(' ')[0])
    : [];

  const presentKpi = kpis.find(k => k.id === 'sessions_today' || k.id === 'present');
  const ratingKpi = kpis.find(k => k.id === 'avg_rating');

  const presentCount = presentKpi ? Number(presentKpi.value) || 0 : 0;
  const absentCount = 0;
  const ratingValue = ratingKpi ? String(ratingKpi.value) : '5.0/5';

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
            <Icon name="user" size={22} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
              Employee Dashboard
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
              Your attendance, students and performance at a glance.
            </p>
          </div>
        </div>
      </div>

      {/* ── Employee Shift Geofenced Punch Center ───────────────────────── */}
      <EmployeeGeofencePunchWidget />

      {/* ── 3 Metric Cards matching reference screenshot ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Present Today */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="users" size={22} className="text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Present Today</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {presentCount}
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-slate-500">
                Checked in
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-sky-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 2: Absent Today */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="user-x" size={22} className="text-rose-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Absent Today</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {absentCount}
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-rose-600">
                Not checked in
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-rose-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 3: Performance Rating */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="star" size={22} className="text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-600 block">Performance Rating</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {ratingValue}
              </div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1 text-slate-500">
                Your current rating
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-amber-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── Two Column Lower Section ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Student Attendance & Progress (~60% width) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Icon name="bar-chart-2" size={18} className="text-purple-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Student Attendance & Progress
                </h3>
              </div>
              <div className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs cursor-pointer">
                <Icon name="calendar" size={13} className="text-purple-600" />
                <span>This Week</span>
                <Icon name="chevron-down" size={13} className="text-slate-400" />
              </div>
            </div>

            {loading ? (
              <div className="py-12">
                <Skeleton className="h-44 w-full rounded-2xl" />
              </div>
            ) : progressData.length === 0 ? (
              <div className="py-14 text-center space-y-2 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <Icon name="bar-chart-2" size={24} className="text-purple-600" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  No chart data available
                </h4>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  Attendance and progress will appear here once data is recorded.
                </p>
              </div>
            ) : (
              <div className="pt-3">
                <LineChart
                  data={progressData}
                  labels={progressLabels}
                  height={190}
                  color="#8B5CF6"
                />
              </div>
            )}
          </div>

          {/* Bottom subtle pastel wave */}
          <svg className="absolute -bottom-1 left-0 right-0 w-full h-14 pointer-events-none opacity-25 text-purple-200" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Right Column: Assigned Students (~40% width) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Icon name="users" size={18} className="text-purple-600" />
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Assigned Students
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/employee/students')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All</span>
                <Icon name="arrow-right" size={13} />
              </button>
            </div>

            {loading ? (
              <div className="py-10 space-y-2.5">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 text-center space-y-2 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2 shadow-2xs">
                  <Icon name="users" size={24} className="text-slate-400" />
                </div>
                <h4 className="text-sm font-black text-slate-900">
                  No assigned students
                </h4>
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Students assigned to you will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/employee/students')}
                  className="bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 hover:opacity-95 text-white rounded-full px-5 py-2 text-xs font-bold shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  <Icon name="plus" size={14} />
                  <span>Assign Students</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-2xs">
                      {m.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{m.name}</div>
                      <div className="text-[11px] font-medium text-slate-500 truncate">
                        {m.membership || 'Active Student'} · {m.attendance || 100}% attendance
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const employeeDashboard = EmployeeDashboard;
export default EmployeeDashboard;
