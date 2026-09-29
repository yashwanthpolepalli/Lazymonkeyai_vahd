import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/services/apiClient';
import type { AttendanceRecord } from '@/services/hrmsApi';
import { cn } from '@/utils/cn';

export type AttendanceRoleFilter = 'ALL' | 'CUSTOMER' | 'TRAINER_STAFF';

interface RecentCheckin {
  id: string;
  customer_id: string;
  customer_name: string;
  person_name?: string;
  user_role?: string;
  event_type: string;
  direction: string;
  device_name: string;
  timestamp: string;
  status: string;
  confidence_score?: number;
  meta_data?: Record<string, any>;
}

interface AttendanceAnalytics {
  today_checkins: number;
  customer_checkins?: number;
  staff_checkins?: number;
  today_events?: number;
  today_granted?: number;
  today_denied?: number;
  today_success_rate?: number;
  peak_hour: string;
  avg_duration: string;
  hourly_data: number[];
  hourly_labels: string[];
  weekly_data: number[];
  weekly_labels: string[];
  recent_checkins: RecentCheckin[];
}

function formatTimestamp(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(iso: string): string {
  if (!iso) return 'Today';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Today';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function getRoleBadge(role?: string) {
  const r = (role || 'CUSTOMER').toUpperCase();
  if (r.includes('TRAINER')) {
    return { label: 'Trainer', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  }
  if (r.includes('OWNER')) {
    return { label: 'Gym Owner', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  }
  if (r.includes('STAFF') || r.includes('MANAGER')) {
    return { label: 'Staff Member', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label: 'Customer', color: 'bg-blue-100 text-blue-700 border-blue-200' };
}

function getMethodBadge(event_type: string) {
  const t = (event_type || '').toUpperCase();
  if (t.includes('FACE')) {
    return { label: 'Face ID', icon: 'camera', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (t.includes('FINGER') || t.includes('BIOMETRIC') || t.includes('TOUCH')) {
    return { label: 'Biometrics / Turnstile', icon: 'fingerprint', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (t.includes('MANUAL')) {
    return { label: 'Manual Punch', icon: 'user-check', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
  if (t.includes('RFID') || t.includes('CARD') || t.includes('NFC')) {
    return { label: 'RFID Card', icon: 'credit-card', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'GPS Geofence', icon: 'map-pin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

interface HrmsAttendanceTabProps {
  attendanceLogs: AttendanceRecord[];
}

export function HrmsAttendanceTab({ attendanceLogs }: HrmsAttendanceTabProps) {
  const [subView, setSubView] = useState<'analytics' | 'all_table' | 'staff_logs'>('analytics');
  const [roleFilter, setRoleFilter] = useState<AttendanceRoleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceAnalytics = (role: AttendanceRoleFilter = roleFilter) => {
    setLoading(true);
    const param = role === 'ALL' ? '' : `?role=${role}`;
    apiClient.get<AttendanceAnalytics>(`/biometrics/analytics${param}`)
      .then((a) => {
        setAnalytics(a);
      })
      .catch(() => {
        setAnalytics(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAttendanceAnalytics(roleFilter);
  }, [roleFilter]);

  // KPIs from DB
  const todayCheckins = analytics?.today_checkins ?? 0;
  const customerCheckins = analytics?.customer_checkins ?? (analytics?.today_checkins ?? 0);
  const staffCheckins = analytics?.staff_checkins ?? 0;
  const peakHour = analytics?.peak_hour ?? '—';
  const avgDuration = analytics?.avg_duration ?? '1h 15m';

  // Recent check-in events from DB
  const rawRecentCheckins = analytics?.recent_checkins ?? [];

  // Filtered check-ins
  const filteredCheckins = rawRecentCheckins.filter((r) => {
    const name = (r.person_name || r.customer_name || '').toLowerCase();
    const id = (r.customer_id || '').toLowerCase();
    const dev = (r.device_name || '').toLowerCase();
    const type = (r.event_type || '').toLowerCase();
    const role = (r.user_role || '').toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    // Query Search
    const matchesSearch = !q || name.includes(q) || id.includes(q) || dev.includes(q) || type.includes(q) || role.includes(q);

    // Method filter
    let matchesMethod = true;
    if (methodFilter === 'FACE') matchesMethod = type.includes('face');
    else if (methodFilter === 'MANUAL') matchesMethod = type.includes('manual');
    else if (methodFilter === 'BIOMETRIC') matchesMethod = type.includes('finger') || type.includes('biometric');
    else if (methodFilter === 'RFID') matchesMethod = type.includes('rfid') || type.includes('card');

    return matchesSearch && matchesMethod;
  });

  // Filtered Staff Logs
  const filteredStaffLogs = attendanceLogs.filter((att) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      att.employee_name.toLowerCase().includes(q) ||
      att.employee_code.toLowerCase().includes(q) ||
      (att.designation && att.designation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ROLE FILTER BAR                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-navy-100 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
            <Icon name="clock" size={24} className="text-purple-600" />
            <span>Attendance &amp; Biometrics Hub</span>
          </h2>
          <p className="text-xs text-navy-500 font-medium mt-1">
            Real-time live attendance logs from database for Customers and Trainers/Staff
          </p>
        </div>

        {/* Dynamic Controls: Role Dropdown Filter & Sub-View Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-navy-50/80 p-1 rounded-xl border border-navy-200/80">
            <span className="text-[11px] font-bold text-navy-600 pl-2 flex items-center gap-1">
              <Icon name="filter" size={13} className="text-purple-600" />
              <span>Role:</span>
            </span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as AttendanceRoleFilter)}
              className="bg-white text-navy-900 font-bold text-xs py-1.5 px-3 rounded-lg border border-navy-200 outline-none shadow-xs cursor-pointer hover:border-purple-400 focus:border-purple-600 transition"
            >
              <option value="ALL">👥 All Attendance (Customer + Staff)</option>
              <option value="CUSTOMER">👤 Customer Attendance Only</option>
              <option value="TRAINER_STAFF">🏋️ Trainer / Staff Attendance Only</option>
            </select>
          </div>

          {/* Sub-view View Switcher */}
          <div className="flex items-center gap-1 bg-navy-50 p-1 rounded-xl border border-navy-200/80">
            <button
              onClick={() => setSubView('analytics')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                subView === 'analytics'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              )}
            >
              <Icon name="activity" size={14} />
              <span>Live Attendance Feed</span>
            </button>
            <button
              onClick={() => setSubView('all_table')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                subView === 'all_table'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              )}
            >
              <Icon name="list" size={14} />
              <span>Attendance Table ({filteredCheckins.length})</span>
            </button>
            <button
              onClick={() => setSubView('staff_logs')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                subView === 'staff_logs'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-navy-600 hover:text-navy-900'
              )}
            >
              <Icon name="calendar-check" size={14} />
              <span>Staff Shifts ({attendanceLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. DYNAMIC LIVE KPIS ROW                                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Total Check-ins */}
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Today's Check-ins</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Icon name="log-in" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">{todayCheckins}</div>
            <div className="text-[11px] text-purple-700 font-bold mt-1 flex items-center gap-1.5">
              <span>{customerCheckins} Customers</span>
              <span>•</span>
              <span>{staffCheckins} Staff</span>
            </div>
          </div>

          {/* Peak Traffic Hour */}
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Peak Hour</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Icon name="clock" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">{peakHour}</div>
            <div className="text-[11px] text-amber-600 font-bold mt-1">Highest scan window</div>
          </div>

          {/* Avg Session Duration */}
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Avg Session Duration</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Icon name="timer" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">{avgDuration}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">Check-in → Check-out</div>
          </div>

          {/* Active Members & Staff Scanned */}
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-500 uppercase tracking-wider">Unique Active Persons</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Icon name="users" size={16} />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-navy-900">
              {rawRecentCheckins.length > 0
                ? new Set(rawRecentCheckins.map(r => r.customer_id || r.customer_name)).size
                : 0}
            </div>
            <div className="text-[11px] text-blue-600 font-bold mt-1">Unique individuals scanned</div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. VIEW 1: LIVE ATTENDANCE FEED                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subView === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Live Biometric Check-ins Stream */}
          <div className="bg-white rounded-2xl p-5 border border-navy-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-navy-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Attendance &amp; Biometric Check-Ins Feed</span>
                </h3>
                <p className="text-xs text-navy-500 font-medium">
                  Dynamic records from database filtered by: <span className="font-bold text-purple-700">{roleFilter === 'ALL' ? 'All Roles (Customer + Staff)' : roleFilter === 'CUSTOMER' ? 'Customers' : 'Trainers & Staff'}</span>
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[220px]">
                <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="Filter feed by name, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-navy-50/80 border border-navy-200 text-xs font-semibold text-navy-900 placeholder-navy-400 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : filteredCheckins.length === 0 ? (
              <div className="py-12 text-center text-navy-400 text-xs font-bold space-y-1">
                <Icon name="calendar-x" size={28} className="mx-auto text-navy-300 mb-2" />
                <div>No attendance check-ins found for {roleFilter === 'ALL' ? 'selected criteria' : roleFilter === 'CUSTOMER' ? 'customers' : 'trainers/staff'} today.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCheckins.map((r, i) => {
                  const roleBadge = getRoleBadge(r.user_role);
                  const methodBadge = getMethodBadge(r.event_type);
                  const displayName = r.person_name || r.customer_name || 'Gym Member';
                  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const isCheckOut = (r.direction || '').toLowerCase().includes('out');

                  return (
                    <div
                      key={`${r.id || r.customer_id}-${i}`}
                      className="p-3.5 rounded-2xl border border-navy-100 bg-white hover:bg-navy-50/50 transition-all shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs',
                          (r.user_role || '').toUpperCase().includes('TRAINER')
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            : (r.user_role || '').toUpperCase().includes('OWNER')
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : (r.user_role || '').toUpperCase().includes('STAFF')
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                        )}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-navy-900 truncate">{displayName}</span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-extrabold border', roleBadge.color)}>
                              {roleBadge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-navy-500 truncate flex items-center gap-1.5 mt-0.5 font-medium">
                            <span>{r.device_name || 'Main Gate Access'}</span>
                            {r.confidence_score && (
                              <span className="text-purple-600 font-bold">({Math.round(r.confidence_score * 100)}% Match)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Method & Time */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border', methodBadge.color)}>
                            <Icon name={methodBadge.icon} size={11} />
                            <span>{methodBadge.label}</span>
                          </span>
                          <span className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-extrabold border',
                            isCheckOut ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          )}>
                            {isCheckOut ? 'OUT' : 'IN'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-navy-700">
                          {formatTimestamp(r.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. VIEW 2: UNIFIED ATTENDANCE TABLE                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subView === 'all_table' && (
        <div className="space-y-4 animate-fade-in">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-navy-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search by name, ID, device..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-navy-50/60 border border-navy-200 text-xs text-navy-900 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* Method Filter Pills */}
            <div className="flex items-center gap-1 bg-navy-50 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'All Methods' },
                { id: 'FACE', label: 'Face ID' },
                { id: 'MANUAL', label: 'Manual' },
                { id: 'BIOMETRIC', label: 'Biometrics' },
                { id: 'RFID', label: 'RFID' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethodFilter(m.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer',
                    methodFilter === m.id
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-navy-600 hover:text-navy-900'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-navy-50/60 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                  <tr>
                    <th className="py-3.5 px-4">Person Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Verification Method</th>
                    <th className="py-3.5 px-4">Direction</th>
                    <th className="py-3.5 px-4">Device / Branch</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Time</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                  {filteredCheckins.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-navy-400 font-bold">
                        No attendance records found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCheckins.map((r, idx) => {
                      const roleBadge = getRoleBadge(r.user_role);
                      const methodBadge = getMethodBadge(r.event_type);
                      const displayName = r.person_name || r.customer_name || 'Gym Member';
                      const isCheckOut = (r.direction || '').toLowerCase().includes('out');

                      return (
                        <tr key={r.id || idx} className="hover:bg-navy-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-navy-900">
                            <div>{displayName}</div>
                            <div className="text-[10px] text-navy-400 font-mono">{r.customer_id || '--'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-extrabold border', roleBadge.color)}>
                              {roleBadge.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border', methodBadge.color)}>
                              <Icon name={methodBadge.icon} size={12} />
                              <span>{methodBadge.label}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border',
                              isCheckOut ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}>
                              <Icon name={isCheckOut ? 'log-out' : 'log-in'} size={12} />
                              <span>{isCheckOut ? 'Check-Out' : 'Check-In'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-navy-700">
                            {r.device_name || 'Main Gate Access'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-navy-600">
                            {formatDate(r.timestamp)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-navy-900">
                            {formatTimestamp(r.timestamp)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {r.status || 'Verified'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. VIEW 3: STAFF SHIFT LOGS TABLE                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {subView === 'staff_logs' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-3 rounded-2xl border border-navy-100 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="text"
                placeholder="Search staff shift logs by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-navy-50/60 border border-navy-100 text-xs text-navy-900 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <div className="text-xs font-bold text-navy-500">
              Showing {filteredStaffLogs.length} record(s)
            </div>
          </div>

          <div className="bg-white border border-navy-100 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50/50 text-[11px] font-black uppercase text-navy-500 tracking-wider border-b border-navy-100">
                <tr>
                  <th className="py-3.5 px-4">EMPLOYEE</th>
                  <th className="py-3.5 px-4">CODE</th>
                  <th className="py-3.5 px-4">DESIGNATION</th>
                  <th className="py-3.5 px-4">DATE</th>
                  <th className="py-3.5 px-4">CHECK-IN</th>
                  <th className="py-3.5 px-4">CHECK-OUT</th>
                  <th className="py-3.5 px-4">HOURS</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 font-medium text-navy-800">
                {filteredStaffLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-navy-400 font-bold">
                      No staff attendance records matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredStaffLogs.map((att) => (
                    <tr key={att.id} className="hover:bg-navy-50/40">
                      <td className="py-3.5 px-4 font-bold text-navy-900">{att.employee_name}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{att.employee_code}</td>
                      <td className="py-3.5 px-4 font-semibold text-navy-700">{att.designation || '--'}</td>
                      <td className="py-3.5 px-4 font-mono">{att.date}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{att.check_in}</td>
                      <td className="py-3.5 px-4 font-mono text-navy-600">{att.check_out}</td>
                      <td className="py-3.5 px-4 font-bold">{att.work_hours} hrs</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            att.status === 'Present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {att.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-navy-500 text-[11px]">{att.notes || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
