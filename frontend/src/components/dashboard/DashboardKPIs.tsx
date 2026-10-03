import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { KpiSummary } from '@/types/dashboard';
import { trainersApi } from '@/services/trainersApi';
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

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const [trainersRes, attendanceRes, leavesRes] = await Promise.all([
          trainersApi.list().catch(() => []),
          hrmsApi.getAttendance().catch(() => []),
          hrmsApi.getLeaves().catch(() => []),
        ]);

        const totalEmp = Array.isArray(trainersRes) ? trainersRes.length : 0;
        const totalBase = Array.isArray(trainersRes)
          ? trainersRes.reduce((acc: number, t: any) => acc + (Number(t.base_monthly_salary) || 0), 0)
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
  const totalRevenue = summary?.today_revenue ?? 0;

  const studentKpis = [
    {
      id: 'total_students',
      label: 'TOTAL STUDENTS',
      value: totalStudents.toLocaleString(),
      change: '↑ Active enrolled',
      isUp: true,
      icon: 'users',
      accentColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'present',
      label: 'PRESENT',
      value: presentStudents.toLocaleString(),
      change: `${presentStudents} checked in today`,
      isUp: true,
      icon: 'user-check',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'leave',
      label: 'LEAVE',
      value: leaveStudents.toLocaleString(),
      change: `${leaveStudents} on approved leave`,
      isUp: false,
      icon: 'calendar',
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'absent',
      label: 'ABSENT',
      value: absentStudents.toLocaleString(),
      change: `${absentStudents} not checked in`,
      isUp: false,
      icon: 'user-x',
      accentColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      id: 'total_revenue',
      label: 'TOTAL REVENUE',
      value: formatINR(totalRevenue),
      change: '↑ Today collections',
      isUp: true,
      icon: 'indian-rupee',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  const employeeKpis = [
    {
      id: 'total_employees',
      label: 'TOTAL EMPLOYEES',
      value: employeeStats.total.toLocaleString(),
      change: '↑ Registered staff',
      isUp: true,
      icon: 'briefcase',
      accentColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'emp_present',
      label: 'PRESENT',
      value: employeeStats.present.toLocaleString(),
      change: `${employeeStats.present} on duty today`,
      isUp: true,
      icon: 'user-check',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'emp_leave',
      label: 'LEAVE',
      value: employeeStats.leave.toLocaleString(),
      change: `${employeeStats.leave} on leave today`,
      isUp: false,
      icon: 'calendar',
      accentColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'emp_absent',
      label: 'ABSENT',
      value: employeeStats.absent.toLocaleString(),
      change: `${employeeStats.absent} absent today`,
      isUp: false,
      icon: 'user-x',
      accentColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      id: 'emp_revenue',
      label: 'TOTAL REVENUE',
      value: formatINR(totalRevenue),
      change: '↑ Today collections',
      isUp: true,
      icon: 'indian-rupee',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  const currentKpis = activeView === 'students' ? studentKpis : employeeKpis;

  return (
    <div className="space-y-3.5">
      {/* View Switcher Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-navy-100/70 rounded-xl border border-navy-200/60 w-fit">
          <button
            type="button"
            onClick={() => setActiveView('students')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              activeView === 'students'
                ? 'bg-white text-blue-700 shadow-xs ring-1 ring-black/5'
                : 'text-navy-600 hover:text-navy-900'
            )}
          >
            <Icon name="users" size={14} className={activeView === 'students' ? 'text-blue-600' : 'text-navy-400'} />
            <span>Students View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('employees')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
              activeView === 'employees'
                ? 'bg-white text-purple-700 shadow-xs ring-1 ring-black/5'
                : 'text-navy-600 hover:text-navy-900'
            )}
          >
            <Icon name="user-check" size={14} className={activeView === 'employees' ? 'text-purple-600' : 'text-navy-400'} />
            <span>Employees View</span>
          </button>
        </div>
        <span className="text-[11px] font-bold text-navy-400 uppercase tracking-wider hidden sm:inline-block">
          {activeView === 'students' ? 'Showing Students Live Attendance & Metrics' : 'Showing Employee Staff Attendance & Metrics'}
        </span>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {currentKpis.map((kpi) => (
          <div
            key={kpi.id}
            className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-400">{kpi.label}</span>
                <div className="text-2xl font-black text-navy-900 tracking-tight mt-1">{kpi.value}</div>
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} ${kpi.accentColor} flex items-center justify-center shrink-0 shadow-xs`}>
                <Icon name={kpi.icon} size={20} />
              </div>
            </div>

            <div className="mt-3">
              <div className={`text-xs font-bold ${kpi.isUp ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1`}>
                {kpi.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
