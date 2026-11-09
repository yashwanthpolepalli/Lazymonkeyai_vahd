import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { studentApi } from '@/services/studentApi';
import { StudentGeofenceCheckinWidget } from '@/components/student/studentGeofenceCheckinWidget';
import type { studentAttendanceData, studentBiometricStatus, studentAttendanceHistory } from '@/types/student';
import { cn } from '@/utils/cn';

export function studentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<studentAttendanceData | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<studentBiometricStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GPS' | 'FACE' | 'BIOMETRIC' | 'MANUAL' | 'RFID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAttendanceData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [attData, bioData] = await Promise.all([
        studentApi.getAttendance().catch(() => null),
        studentApi.getBiometricStatus().catch(() => null),
      ]);

      if (attData) {
        setAttendance(attData);
      } else {
        // Fallback default structure if empty
        setAttendance({
          total_visits: 0,
          current_streak: 0,
          monthly_visits: 0,
          last_visit: null,
          history: [],
        });
      }
      setBiometricStatus(bioData);
    } catch (err: any) {
      console.error('Failed to load student attendance:', err);
      setError('Unable to load attendance records. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(true);
  }, []);

  const monthlyTarget = attendance?.monthly_target || 20;
  const monthlyVisits = attendance?.monthly_visits ?? 0;
  const progressPct = Math.min(100, Math.round((monthlyVisits / monthlyTarget) * 100));

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!attendance?.history) return [];

    return attendance.history.filter((item) => {
      const type = (item.type || item.event_type || item.verification_type || '').toUpperCase();
      const dev = (item.device_name || '').toLowerCase();
      const dt = (item.date || '').toLowerCase();
      const tm = (item.time || '').toLowerCase();
      const query = searchQuery.trim().toLowerCase();

      // Filter by Method Category
      let matchesCategory = true;
      if (activeFilter === 'GPS') {
        matchesCategory = type.includes('GPS') || type.includes('GEO') || dev.includes('geofence') || dev.includes('gps');
      } else if (activeFilter === 'FACE') {
        matchesCategory = type.includes('FACE') || dev.includes('face');
      } else if (activeFilter === 'BIOMETRIC') {
        matchesCategory = type.includes('FINGER') || type.includes('TOUCH') || type.includes('BIOMETRIC') || dev.includes('turnstile');
      } else if (activeFilter === 'MANUAL') {
        matchesCategory = type.includes('MANUAL') || dev.includes('manual');
      } else if (activeFilter === 'RFID') {
        matchesCategory = type.includes('RFID') || type.includes('CARD') || type.includes('NFC');
      }

      // Search Query
      const matchesSearch = !query || dt.includes(query) || tm.includes(query) || dev.includes(query) || type.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [attendance?.history, activeFilter, searchQuery]);

  // Generate Current Month Days for Visual Consistency Calendar
  const monthCalendarDays = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todayDateNumber = today.getDate();

    // Map attended days of current month
    const attendedDayNumbers = new Set<number>();
    if (attendance?.history) {
      attendance.history.forEach((h) => {
        if (h.timestamp) {
          const d = new Date(h.timestamp);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            attendedDayNumbers.add(d.getDate());
          }
        }
      });
    }

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dayNum: i,
        isAttended: attendedDayNumbers.has(i),
        isToday: i === todayDateNumber,
        isFuture: i > todayDateNumber,
      });
    }
    return days;
  }, [attendance?.history]);

  const getMethodBadge = (item: studentAttendanceHistory) => {
    const rawType = (item.type || item.event_type || item.verification_type || '').toUpperCase();
    const dev = (item.device_name || '').toLowerCase();

    if (rawType.includes('FACE') || dev.includes('face')) {
      return { label: 'Face Recognition', icon: 'camera', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    }
    if (rawType.includes('FINGER') || rawType.includes('BIOMETRIC') || rawType.includes('TOUCH') || dev.includes('turnstile') || dev.includes('biometric')) {
      return { label: 'Biometrics / Turnstile', icon: 'fingerprint', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    }
    if (rawType.includes('MANUAL') || dev.includes('manual')) {
      return { label: 'Manual Check-in', icon: 'user-check', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
    }
    if (rawType.includes('RFID') || rawType.includes('CARD') || rawType.includes('NFC') || dev.includes('rfid')) {
      return { label: 'RFID Member Card', icon: 'credit-card', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    }
    return { label: 'GPS Geofence', icon: 'map-pin', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const formatDisplayTime = (isoString?: string, fallbackTime?: string) => {
    if (fallbackTime) return fallbackTime;
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return fallbackTime || '--:--';
    }
  };

  const formatDisplayDate = (isoString?: string, fallbackDate?: string) => {
    if (fallbackDate) return fallbackDate;
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return fallbackDate || '--';
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-7 w-64 rounded-xl mt-1.5" />
        </div>
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600 hover:underline cursor-pointer">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Attendance</span>
        </div>
        <ErrorState message={error} onRetry={() => fetchAttendanceData(true)} />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-4 space-y-5 font-sans text-slate-900 animate-fade-in pb-12">
      {/* ── 1. Breadcrumb & Themed Header matching screenshot ───────────────── */}
      <div className="space-y-1">
        <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1.5">
          <Icon name="home" size={13} className="text-blue-600" />
          <span className="text-blue-600 hover:underline cursor-pointer">Student</span>
          <span className="text-slate-400">›</span>
          <span className="text-slate-900 font-extrabold">Attendance</span>
        </div>

        <div className="flex items-center gap-3.5 pt-0.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
            <Icon name="fingerprint" size={22} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight">
              vahd Attendance &amp; Access
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
              Live Face ID, hardware biometric turnstile sync &amp; consistency logs
            </p>
          </div>
        </div>
      </div>

      {/* 1. Interactive Geofence & Face ID Punch Widget */}
      <StudentGeofenceCheckinWidget onCheckinSuccess={() => fetchAttendanceData(false)} />

      {/* 2. Key Metrics Row (4 Columns with Pastel Waves) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Check-Ins */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="calendar-check" size={20} className="text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-700 block">Total Check-Ins</span>
              <div className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1">
                {attendance?.total_visits ?? 0}
              </div>
              <div className="text-xs font-bold text-purple-600 mt-2 flex items-center gap-1.5">
                <Icon name="user" size={13} className="text-purple-600" />
                <span>Lifetime verified sessions</span>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-emerald-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Active Streak */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="flame" size={20} className="text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-700 block">Active Streak</span>
              <div className="text-3xl font-black text-amber-600 tracking-tight leading-none mt-1">
                {attendance?.current_streak ?? 0} Days
              </div>
              <div className="text-xs font-bold text-amber-700 mt-2">
                Check in today to start streak
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-amber-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Monthly Target Progress */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="target" size={20} className="text-teal-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-700 block">This Month</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-teal-600 tracking-tight leading-none">
                  {monthlyVisits}
                </span>
                <span className="text-xs font-bold text-slate-400">/ {monthlyTarget} days</span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>Goal: {monthlyTarget} Visits</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-teal-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Last Check-In */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/90 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="clock" size={20} className="text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-700 block">Last Check-In</span>
              <div className="text-lg font-black text-slate-900 tracking-tight leading-tight mt-1 truncate">
                {attendance?.last_visit
                  ? formatDisplayDate(attendance.last_visit)
                  : 'No scans yet'}
              </div>
              <div className="text-xs font-bold text-blue-600 mt-2 truncate">
                {attendance?.last_visit ? formatDisplayTime(attendance.last_visit) : 'Ready for first session'}
              </div>
            </div>
          </div>
          <svg className="absolute -bottom-1 right-0 w-3/4 h-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity text-purple-200/60" viewBox="0 0 160 50" fill="none" preserveAspectRatio="none">
            <path d="M0,50 Q45,28 95,38 T160,12 L160,50 Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* 3. Monthly Consistency Calendar & Biometric Channel Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Consistency Heatmap */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                <Icon name="calendar" size={18} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Monthly Attendance Consistency
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} activity tracker
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs" /> Attended
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Absent
              </span>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-2 pt-1">
            {monthCalendarDays.map((d) => (
              <div
                key={d.dayNum}
                className={cn(
                  'h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all text-xs font-bold relative group',
                  d.isAttended
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs'
                    : d.isToday
                      ? 'bg-purple-50 border-purple-400 text-purple-700 ring-2 ring-purple-400/30 font-black'
                      : d.isFuture
                        ? 'bg-slate-50/50 border-slate-100 text-slate-300'
                        : 'bg-slate-50/80 border-slate-200/80 text-slate-500'
                )}
              >
                <span>{d.dayNum}</span>
                {d.isAttended ? (
                  <Icon name="check" size={12} className="text-emerald-600 mt-0.5" />
                ) : (
                  <span className="text-[9px] font-semibold text-slate-400">
                    {d.isToday ? 'Today' : '-'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs text-purple-900 font-semibold">
            <span className="flex items-center gap-2">
              <Icon name="sparkles" size={15} className="text-purple-600 shrink-0" />
              <span>Attending regularly ensures continuous learning progress and recognition.</span>
            </span>
            <span className="font-extrabold text-purple-700 shrink-0">{monthlyVisits} Days Logged</span>
          </div>
        </div>

        {/* Biometric Access Status Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="shield-check" size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Biometric Access Hub</h3>
              <p className="text-xs text-slate-500 font-medium">Turnstile &amp; door permissions</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Face ID */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
                  <Icon name="camera" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Face Recognition</div>
                  <div className="text-[10px] text-slate-400 font-medium">Camera Entrance Gate</div>
                </div>
              </div>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ENROLLED
              </span>
            </div>

            {/* Fingerprint */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
                  <Icon name="fingerprint" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Fingerprint Sensor</div>
                  <div className="text-[10px] text-slate-400 font-medium">Biometric Turnstile</div>
                </div>
              </div>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                NOT ENROLLED
              </span>
            </div>

            {/* RFID Card */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
                  <Icon name="credit-card" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">NFC / RFID Card</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    None
                  </div>
                </div>
              </div>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Active Key
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500 font-medium leading-relaxed">
            <Icon name="info" size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <span>vahd door access permissions are automatically synced live with your active membership.</span>
          </div>
        </div>
      </div>

      {/* 4. Filterable Attendance History Table */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon name="history" size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Attendance History Logs
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Complete records of your check-in and check-out punches
              </p>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date, device..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'MANUAL', label: 'Manual' },
                { id: 'FACE', label: 'Face ID' },
                { id: 'BIOMETRIC', label: 'Biometrics' },
                { id: 'GPS', label: 'GPS' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setActiveFilter(pill.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    activeFilter === pill.id
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History Records List */}
        {filteredHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Check-In</th>
                  <th className="py-3 px-3">Check-Out</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Verification Method</th>
                  <th className="py-3 px-3">Gate / Branch Device</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredHistory.map((item, idx) => {
                  const badge = getMethodBadge(item);
                  const inTime = item.check_in || item.time || '--:--';
                  const outTime = item.check_out || '--:--';
                  const isCurrentlyActive = item.is_active || outTime.includes('Active') || outTime.includes('In vahd');

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">
                          {formatDisplayDate(item.timestamp, item.date)}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Icon name="log-in" size={12} />
                          <span>{inTime}</span>
                        </span>
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-3">
                        {outTime !== '--:--' && !isCurrentlyActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            <Icon name="log-out" size={12} />
                            <span>{outTime}</span>
                          </span>
                        ) : isCurrentlyActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            <span>In vahd (Active)</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">--:--</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-700">
                          {item.duration || '--'}
                        </span>
                      </td>

                      {/* Method Badge */}
                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                            badge.color
                          )}
                        >
                          <Icon name={badge.icon} size={12} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Device Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-700">
                          {item.device_name || user?.branchName || 'Main vahd Entrance'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Verified Scan
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md border',
                            isCurrentlyActive
                              ? 'text-purple-700 bg-purple-50 border-purple-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          )}
                        >
                          <Icon name="check-circle" size={12} />
                          <span>{item.status || 'Present'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Icon name="calendar-x" size={26} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Attendance Records Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || activeFilter !== 'ALL'
                ? 'No check-in logs match your current search or filter criteria.'
                : 'You have not checked in to the vahd yet. Use the Check-In button above to mark your first session!'}
            </p>
            {(searchQuery || activeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('ALL');
                }}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
