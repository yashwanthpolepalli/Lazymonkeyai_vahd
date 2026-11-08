import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { KpiSummary } from '@/types/dashboard';
import { employeesApi } from '@/services/employeesApi';
import { hrmsApi } from '@/services/hrmsApi';
import { cn } from '@/utils/cn';

interface DashboardKPIsProps {
  summary: KpiSummary;
}

export function DashboardKPIs({ summary }: DashboardKPIsProps) {
  const [activeView, setActiveView] = useState<'students' | 'employees'>('students');
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    present: 0,
    leave: 0,
    absent: 0,
    monthlyBase: 0,
  });

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const [employeesRes, attendanceRes, leavesRes] = await Promise.all([
          employeesApi.list().catch(() => []),
          hrmsApi.getAttendance().catch(() => []),
          hrmsApi.getLeaves().catch(() => []),
        ]);

        const totalEmp = Array.isArray(employeesRes) ? employeesRes.length : 0;
        const totalBase = Array.isArray(employeesRes)
          ? employeesRes.reduce((acc: number, t: any) => acc + (Number(t.base_monthly_salary) || 0), 0)
          : 0;

        const todayIso = new Date().toISOString().split('T')[0];
        const todayAttendance = Array.isArray(attendanceRes)
          ? attendanceRes.filter((a: any) => a.date === todayIso || a.timestamp?.startsWith(todayIso))
          : [];
        const presentCount = todayAttendance.filter((a: any) => a.check_in || a.status?.toLowerCase() === 'present').length;

        const todayLeaves = Array.isArray(leavesRes)
          ? leavesRes.filter((l: any) => l.status?.toLowerCase() === 'approved' && l.start_date <= todayIso && l.end_date >= todayIso)
          : [];
        const leaveCount = todayLeaves.length;
        const absentCount = Math.max(0, totalEmp - presentCount - leaveCount);

        setEmployeeStats({
          total: totalEmp,
          present: presentCount,
          leave: leaveCount,
          absent: absentCount,
          monthlyBase: totalBase,
        });
      } catch (err) {
        console.error('Error fetching employee KPI data:', err);
      }
    };

    fetchEmployeeData();
  }, []);

  const totalStudents = summary?.total_members ?? 0;
  const presentStudents = summary?.checkins_today ?? 0;
  const leaveStudents = 0;
  const absentStudents = Math.max(0, totalStudents - presentStudents - leaveStudents);

  const studentKpis = [
    {
      id: 'total_students',
      label: 'Total Students',
      value: totalStudents.toLocaleString(),
      change: '↑ Active enrolled',
      changeColor: 'text-emerald-600',
      icon: 'graduation-cap',
      accentColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100/90',
      waveColor: 'text-sky-200/60',
    },
    {
      id: 'present',
      label: 'Present',
      value: presentStudents.toLocaleString(),
      change: `${presentStudents} checked in today`,
      changeColor: 'text-emerald-600',
      icon: 'user-check',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100/90',
      waveColor: 'text-emerald-200/60',
    },
    {
      id: 'leave',
      label: 'Leave',
      value: leaveStudents.toLocaleString(),
      change: `${leaveStudents} on approved leave`,
      changeColor: 'text-amber-600',
      icon: 'calendar',
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100/90',
      waveColor: 'text-amber-200/60',
    },
    {
      id: 'absent',
      label: 'Absent',
      value: absentStudents.toLocaleString(),
      change: `${absentStudents} not checked in`,
      changeColor: 'text-rose-600',
      icon: 'user-x',
      accentColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100/90',
      waveColor: 'text-rose-200/60',
    },
  ];

  const employeeKpis = [
    {
      id: 'total_employees',
      label: 'Total Employees',
      value: employeeStats.total.toLocaleString(),
      change: '↑ Registered staff',
      changeColor: 'text-emerald-600',
      icon: 'briefcase',
      accentColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100/90',
      waveColor: 'text-purple-200/60',
    },
    {
      id: 'emp_present',
      label: 'Present',
      value: employeeStats.present.toLocaleString(),
      change: `${employeeStats.present} on duty today`,
      changeColor: 'text-emerald-600',
      icon: 'user-check',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100/90',
      waveColor: 'text-emerald-200/60',
    },
    {
      id: 'emp_leave',
      label: 'Leave',
      value: employeeStats.leave.toLocaleString(),
      change: `${employeeStats.leave} on leave today`,
      changeColor: 'text-amber-600',
      icon: 'calendar',
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100/90',
      waveColor: 'text-amber-200/60',
    },
    {
      id: 'emp_absent',
      label: 'Absent',
      value: employeeStats.absent.toLocaleString(),
      change: `${employeeStats.absent} absent today`,
      changeColor: 'text-rose-600',
      icon: 'user-x',
      accentColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100/90',
      waveColor: 'text-rose-200/60',
    },
  ];

  const currentKpis = activeView === 'students' ? studentKpis : employeeKpis;

  return (
    <div className="space-y-4">
      {/* View Switcher Toggle & Live Indicator matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('students')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs',
              activeView === 'students'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
            )}
          >
            <Icon name="users" size={14} className={activeView === 'students' ? 'text-white' : 'text-slate-500'} />
            <span>Students View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('employees')}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs',
              activeView === 'employees'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90'
            )}
          >
            <Icon name="user-check" size={14} className={activeView === 'employees' ? 'text-white' : 'text-slate-500'} />
            <span>Employees View</span>
          </button>
        </div>

        {/* Live Attendance Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
          <span>
            {activeView === 'students'
              ? 'Showing Students Live Attendance & Metrics'
              : 'Showing Employee Staff Attendance & Metrics'}
          </span>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentKpis.map((kpi) => (
          <div
            key={kpi.id}
            className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group"
          >
            <div className="flex items-start gap-4 relative z-10">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border', kpi.bgColor, kpi.accentColor, kpi.borderColor)}>
                <Icon name={kpi.icon} size={22} className={kpi.accentColor} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-600 block">{kpi.label}</span>
                <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                  {kpi.value}
                </div>
                <div className={cn('text-xs font-bold mt-2 flex items-center gap-1', kpi.changeColor)}>
                  {kpi.change}
                </div>
              </div>
            </div>

            {/* Bottom pastel wave accent matching mockup */}
            <svg
              className={cn(
                'absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity',
                kpi.waveColor
              )}
              viewBox="0 0 160 50"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M0,50 Q45,28 95,38 T160,12 L160,50 Z"
                fill="currentColor"
              />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
