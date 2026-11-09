import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { studentApi } from '@/services/studentApi';
import type {
  studentDashboardData,
  studentAttendanceData,
} from '@/types/student';
import { StudentGoogleReviewCard } from '@/components/student/studentGoogleReviewCard';

export function studentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<studentDashboardData | null>(null);
  const [attendance, setAttendance] = useState<studentAttendanceData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      studentApi.getDashboard(),
      studentApi.getAttendance().catch(() => null),
    ])
      .then(([d, att]) => {
        setDashboard(d);
        setAttendance(att);
      })
      .catch(() => {
        setError('Unable to load dashboard metrics. Please check connection and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const userName = user?.name ? user.name.split(' ')[0] : 'John';

  const monthlyTarget = attendance?.monthly_target || 20;
  const monthlyVisits = attendance?.monthly_visits ?? 0;
  const progressPct = Math.min(100, Math.round((monthlyVisits / monthlyTarget) * 100));

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-4 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-7 w-60 rounded-xl mt-1.5" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-4 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600 hover:underline cursor-pointer">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Home</span>
        </div>
        <ErrorState message={error} onRetry={fetchDashboard} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 space-y-4 font-sans text-slate-900 animate-fade-in pb-12">
      {/* ── 1. Breadcrumb & Themed Header matching screenshot ───────────────── */}
      <div className="space-y-0.5">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600 hover:underline cursor-pointer">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Home</span>
        </div>

        <div className="flex items-center gap-3 pt-0.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="graduation-cap" size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Here is your course overview and attendance summary.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Top Banner Card (Sleek, Compact Multi-stop Gradient) ────────── */}
      <div className="card px-5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 via-purple-600 to-orange-500 text-white rounded-2xl shadow-md relative overflow-hidden font-sans">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">👋</span>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight truncate">
                Welcome back, {userName}!
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 text-xs font-semibold text-white/95">
              <div className="flex items-center gap-1.5">
                <Icon name="activity" size={14} className="text-white shrink-0" />
                <span>
                  Status: <strong className="font-black uppercase tracking-wider">{dashboard?.course_progress?.status || 'ACTIVE'}</strong>
                </span>
              </div>

              <span className="text-white/40 hidden sm:inline">|</span>

              <div className="flex items-center gap-1.5">
                <Icon name="calendar" size={14} className="text-white shrink-0" />
                <span>{monthlyVisits} Visits This Month</span>
              </div>

              <span className="text-white/40 hidden sm:inline">|</span>

              <div className="flex items-center gap-1.5">
                <Icon name="clock" size={14} className="text-white shrink-0" />
                <span>{dashboard?.course_progress?.days_remaining ?? 30} Days Remaining</span>
              </div>
            </div>
          </div>

          {/* Right Donut Progress Ring (Compact & Sleek) */}
          <div className="flex flex-col items-center justify-center shrink-0 self-center sm:self-auto">
            <ProgressRing
              value={dashboard?.course_progress?.progress_percentage ?? 0}
              max={100}
              size={64}
              strokeWidth={5}
              color="#ffffff"
              trackColor="rgba(255,255,255,0.25)"
              label={`${dashboard?.course_progress?.progress_percentage ?? 0}%`}
              textColor="text-white"
              labelClassName="text-sm font-black text-white tracking-tight"
            />
            <span
              className="mt-1 text-[9px] font-black uppercase tracking-wider text-white bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-xs truncate max-w-[140px] text-center"
              title={dashboard?.course_progress?.plan_name || 'ENROLLED COURSE'}
            >
              {dashboard?.course_progress?.plan_name || 'ENROLLED COURSE'}
            </span>
            <span className="text-[10px] text-white/90 font-medium mt-0.5">
              {dashboard?.course_progress?.days_elapsed ?? 0} of {dashboard?.course_progress?.total_days ?? 30} Days
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Quick Action Shortcut Cards (2 Columns) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Attendance & Check-in */}
        <div
          onClick={() => navigate('/app/attendance')}
          className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Icon name="calendar-check" size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                Attendance &amp; Check-in
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <span>Tap to open</span>
                <Icon name="chevron-right" size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-1/2 h-12 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity text-sky-200/70" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 2: My Profile & Account */}
        <div
          onClick={() => navigate('/app/profile')}
          className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Icon name="user" size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                My Profile &amp; Account
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                <span>Tap to open</span>
                <Icon name="chevron-right" size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-1/2 h-12 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity text-purple-200/70" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── 4. 4 KPI Summary Cards (4 Columns) ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: PRESENT */}
        <div className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="user-check" size={18} className="text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">PRESENT</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {monthlyVisits}
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1.5">
                <span>↗</span>
                <span>Verified Check-ins</span>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-10 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-emerald-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 2: ABSENT */}
        <div className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="calendar" size={18} className="text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">ABSENT</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {attendance?.absent_days ?? 0}
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full mt-1.5">
                <span>Days Missed</span>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-10 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-purple-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 3: LEAVES */}
        <div className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="clock" size={18} className="text-sky-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">LEAVES</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {attendance?.leaves_count ?? 0}
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full mt-1.5">
                <span>Approved Leaves</span>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-10 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-sky-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Card 4: APPROVALS */}
        <div className="p-4 sm:p-4.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="shield-check" size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block">APPROVALS</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                Verified
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-1.5">
                <span>↗</span>
                <span>Access Approved</span>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-10 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-amber-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* ── 5. Attendance Hub Section matching screenshot ────────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-4 sm:p-5 space-y-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="bar-chart-2" size={17} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">Attendance</h3>
            <p className="text-xs text-slate-500 font-medium">Vahd visits &amp; consistency</p>
          </div>
        </div>

        {/* Two Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0">
              <Icon name="users" size={18} className="text-purple-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Total Visits</div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-0.5">
                {attendance?.total_visits ?? 0}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-600 flex items-center justify-center shrink-0">
              <Icon name="flame" size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500">Current Streak</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 leading-tight mt-0.5">
                {attendance?.current_streak ?? 0} Days
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Goal Progress Bar */}
        <div className="pt-0.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
            <span>This Month ({monthlyVisits} visits)</span>
            <span className="text-slate-500">{progressPct}% of goal</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Official Google Business Reviews & AI Suggestion Hub */}
      <StudentGoogleReviewCard />
    </div>
  );
}

export const StudentDashboard = studentDashboard;
