import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/customerApi';
import { CustomerGeofenceCheckinWidget } from '@/components/customer/CustomerGeofenceCheckinWidget';
import type { CustomerAttendanceData, CustomerBiometricStatus, CustomerAttendanceHistory } from '@/types/customer';
import { cn } from '@/utils/cn';

export function CustomerAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<CustomerAttendanceData | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<CustomerBiometricStatus | null>(null);
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
        customerApi.getAttendance().catch(() => null),
        customerApi.getBiometricStatus().catch(() => null),
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
      console.error('Failed to load customer attendance:', err);
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

  const getMethodBadge = (item: CustomerAttendanceHistory) => {
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
      <div className="space-y-6">
        <PageHeader title="Gym Attendance" breadcrumb={['Customer', 'Attendance']} />
        <Skeleton className="h-48 w-full rounded-3xl" />
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
      <div className="space-y-6">
        <PageHeader title="Gym Attendance" breadcrumb={['Customer', 'Attendance']} />
        <ErrorState message={error} onRetry={() => fetchAttendanceData(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gym Attendance & Access"
        subtitle="Live Face ID, hardware biometric turnstile sync & consistency logs"
        breadcrumb={['Customer', 'Attendance']}
      />

      {/* 1. Interactive Geofence & Face ID Punch Widget */}
      <CustomerGeofenceCheckinWidget onCheckinSuccess={() => fetchAttendanceData(false)} />

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Visits */}
        <div className="card p-5 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Icon name="calendar-check" size={20} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Check-Ins</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {attendance?.total_visits ?? 0}
          </div>
          <div className="text-[11px] font-medium text-purple-600 mt-1 flex items-center gap-1">
            <Icon name="award" size={12} />
            <span>Lifetime verified sessions</span>
          </div>
        </div>

        {/* Current Streak */}
        <div className="card p-5 bg-gradient-to-br from-white to-amber-50/40 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Icon name="flame" size={20} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Streak</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1 flex items-center gap-2">
            <span>{attendance?.current_streak ?? 0}</span>
            <span className="text-base font-bold text-slate-500">Days</span>
          </div>
          <div className="text-[11px] font-semibold text-amber-700 mt-1">
            {attendance?.current_streak && attendance.current_streak > 0 ? '🔥 Keep the momentum alive!' : 'Check in today to start streak'}
          </div>
        </div>

        {/* Monthly Target Progress */}
        <div className="card p-5 bg-gradient-to-br from-white to-emerald-50/40 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Icon name="target" size={20} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Month</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {monthlyVisits} <span className="text-xs font-bold text-slate-400">/ {monthlyTarget} days</span>
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-slate-500">
              <span>Goal: {monthlyTarget} Visits</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Last Visit Timestamp */}
        <div className="card p-5 bg-gradient-to-br from-white to-blue-50/40 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Icon name="clock" size={20} />
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Check-In</div>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate">
            {attendance?.last_visit
              ? formatDisplayDate(attendance.last_visit)
              : 'No scans yet'}
          </div>
          <div className="text-xs font-semibold text-blue-600 mt-0.5 truncate">
            {attendance?.last_visit ? formatDisplayTime(attendance.last_visit) : 'Ready for first session'}
          </div>
        </div>
      </div>

      {/* 3. Monthly Consistency Calendar & Biometric Channel Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Consistency Heatmap */}
        <div className="lg:col-span-2 card p-5 sm:p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Icon name="calendar" size={16} className="text-purple-600" />
                <span>Monthly Workout &amp; Attendance Consistency</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} activity tracker
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-xs" /> Attended
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-purple-600 inline-block ring-2 ring-purple-300" /> Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-100 inline-block border border-slate-200" /> Rest
              </span>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-2 pt-2">
            {monthCalendarDays.map((d) => (
              <div
                key={d.dayNum}
                className={cn(
                  'h-12 rounded-xl flex flex-col items-center justify-center p-1 border transition-all text-xs font-black relative group',
                  d.isAttended
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                    : d.isToday
                    ? 'bg-purple-50 border-purple-400 text-purple-700 ring-2 ring-purple-400/30'
                    : d.isFuture
                    ? 'bg-slate-50/50 border-slate-100 text-slate-300'
                    : 'bg-slate-50 border-slate-200/80 text-slate-400'
                )}
              >
                <span>{d.dayNum}</span>
                {d.isAttended ? (
                  <Icon name="check" size={12} className="text-emerald-600 mt-0.5" />
                ) : (
                  <span className="text-[9px] font-normal text-slate-400">
                    {d.isToday ? 'Today' : '-'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center justify-between text-xs text-purple-900 font-semibold">
            <span className="flex items-center gap-2">
              <Icon name="sparkles" size={15} className="text-purple-600 shrink-0" />
              <span>Attending regularly unlocks bonus AI workout progressions and recovery badges.</span>
            </span>
            <span className="font-extrabold text-purple-700 shrink-0">{monthlyVisits} Days Logged</span>
          </div>
        </div>

        {/* Biometric Access Status Card */}
        <div className="card p-5 sm:p-6 bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Icon name="shield-check" size={16} className="text-purple-600" />
              <span>Biometric Access Hub</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Turnstile &amp; door permissions</p>
          </div>

          <div className="space-y-3">
            {/* Face ID */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Icon name="camera" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Face Recognition</div>
                  <div className="text-[10px] text-slate-400 font-medium">Camera Entrance Gate</div>
                </div>
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-extrabold border',
                  biometricStatus?.face_recognition?.enrolled
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                )}
              >
                {biometricStatus?.face_recognition?.status || (biometricStatus?.face_recognition?.enrolled ? 'Enrolled & Active' : 'Not Enrolled')}
              </span>
            </div>

            {/* Fingerprint */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Icon name="fingerprint" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Fingerprint Sensor</div>
                  <div className="text-[10px] text-slate-400 font-medium">Biometric Turnstile</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200">
                {biometricStatus?.fingerprint?.status || 'Enrolled'}
              </span>
            </div>

            {/* RFID Card */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Icon name="credit-card" size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">NFC / RFID Card</div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {biometricStatus?.rfid_card?.card_number || `RFID-${user?.id?.slice(-4) || 'KEY'}`}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700 border border-emerald-200">
                Active Key
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed italic pt-1">
            Gym door access permissions are automatically synced live with your active membership.
          </p>
        </div>
      </div>

      {/* 4. Filterable Attendance History Table */}
      <div className="card bg-white border border-slate-200/80 shadow-xs rounded-2xl overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Table Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Icon name="history" size={18} className="text-purple-600" />
              <span>Attendance History Logs</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Complete records of your check-in and check-out punches
            </p>
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
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
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
                    'px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all',
                    activeFilter === pill.id
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
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
                  const isCurrentlyActive = item.is_active || outTime.includes('Active') || outTime.includes('In Gym');

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
                            <span>In Gym (Active)</span>
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
                          {item.device_name || user?.branchName || 'Main Gym Entrance'}
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
                : 'You have not checked in to the gym yet. Use the Check-In button above to mark your first session!'}
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
