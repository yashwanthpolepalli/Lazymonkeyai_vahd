import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { LiveActivityItem } from '@/types/dashboard';
import { hrmsApi } from '@/services/hrmsApi';
import { employeesApi } from '@/services/employeesApi';
import { cn } from '@/utils/cn';

interface LivevahdActivityProps {
  activity: LiveActivityItem[];
}

interface EnrichedActivityItem {
  id: string;
  role: 'Student' | 'Employee';
  action: 'Check-in' | 'Check-out';
  name: string;
  studentId: string;
  location: string;
  device: string;
  time: string;
  fullDateStr: string;
  status: 'success' | 'warning';
  _sortTime: number;
}

/** Derive whether a biometric log entry is Employee or Student purely from backend data */
function resolveRole(roleUpper: string, rawCustId: string): 'Employee' | 'Student' {
  if (
    roleUpper === 'STUDENT' ||
    roleUpper === 'student' ||
    roleUpper === 'MEMBER' ||
    (rawCustId.startsWith('cust_') && !rawCustId.startsWith('cust_usr_'))
  ) {
    return 'Student';
  }
  if (
    roleUpper === 'EMPLOYEE' ||
    roleUpper === 'employee' ||
    roleUpper === 'STAFF' ||
    roleUpper === 'COACH' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'OWNER' ||
    roleUpper === 'MANAGER'
  ) {
    return 'Employee';
  }
  // Fallback: if no student ID prefix → treat as employee (staff have no cust_ id)
  return rawCustId.startsWith('emp_') || rawCustId.startsWith('tr_') || !rawCustId
    ? 'Employee'
    : 'Student';
}

/** Format ISO timestamp to time string and short date string */
function formatTimestamp(timestamp?: string, fallbackTime?: string): { time: string; fullDateStr: string; sortTime: number } {
  if (timestamp) {
    try {
      const d = new Date(timestamp);
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        fullDateStr: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        sortTime: d.getTime(),
      };
    } catch (_) { /* fall through */ }
  }
  return { time: fallbackTime || '', fullDateStr: '', sortTime: Date.now() };
}

export function LivevahdActivity({ activity }: LivevahdActivityProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'students' | 'employees' | 'checkins' | 'checkouts'>('all');
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);

  useEffect(() => {
    // Load HRMS attendance to supplement biometric data
    Promise.all([
      hrmsApi.getAttendance().catch(() => []),
      hrmsApi.getEmployees().catch(() => []),
      employeesApi.list().catch(() => []),
    ]).then(([attendance, _emps, _employees]) => {
      if (Array.isArray(attendance)) setEmployeeAttendance(attendance);
    }).catch(() => { });
  }, []);

  const handleScroll = (direction: 'up' | 'down') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ top: direction === 'up' ? -150 : 150, behavior: 'smooth' });
    }
  };

  /** Build unified activity list — only CHECK_IN and CHECK_OUT events */
  const unifiedActivity: EnrichedActivityItem[] = useMemo(() => {
    const list: EnrichedActivityItem[] = [];

    // ── 1. Biometric logs from backend (primary source of truth) ──────────────
    (activity || []).forEach((item) => {
      const dir = (item.direction || '').toUpperCase();
      const isLogout = dir.includes('OUT') || dir.includes('EXIT') || item.type === 'checkout';

      const roleUpper = (
        (item as any).resolved_role ||
        (item as any).role ||
        (item as any).person_role ||
        ''
      ).toUpperCase();

      const rawCustId = (
        (item as any).customer_id ||
        (item as any).student_id ||
        (item as any).user_id ||
        (item as any).member_id ||
        ''
      );

      const resolved = resolveRole(roleUpper, rawCustId);
      const name = (item.person_name || item.name || '').trim() || 'Unknown Attendee';
      const { time, fullDateStr, sortTime } = formatTimestamp(item.timestamp, item.time);

      list.push({
        id: item.id || `bio_${sortTime}_${Math.random()}`,
        role: resolved,
        action: isLogout ? 'Check-out' : 'Check-in',
        name,
        studentId: (item as any).student_code || (item as any).employee_code || rawCustId || '',
        location: (item as any).branch || (item as any).location || '',
        device: item.device || (item as any).device_name || '',
        time,
        fullDateStr,
        status: isLogout ? 'warning' : 'success',
        _sortTime: sortTime,
      });
    });

    // ── 2. Supplemental HRMS attendance records ──────────────────────────────
    employeeAttendance.forEach((emp: any) => {
      const empName = emp.name || emp.employee_name || 'Staff Member';
      const empId = emp.employee_code || emp.employee_id || emp.id || '';

      const processEntry = (timeVal: string, action: 'Check-in' | 'Check-out') => {
        let dt = new Date();
        let formattedTime = timeVal;
        let fullDateStr = '';

        if (timeVal.includes('T') || timeVal.includes('-')) {
          try {
            dt = new Date(timeVal);
            formattedTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            fullDateStr = dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
          } catch (_) { }
        }

        list.push({
          id: `hrms_${empId}_${action}_${dt.getTime()}`,
          role: 'Employee',
          action,
          name: empName,
          studentId: String(empId),
          location: emp.department || '',
          device: '',
          time: formattedTime,
          fullDateStr,
          status: action === 'Check-out' ? 'warning' : 'success',
          _sortTime: dt.getTime(),
        });
      };

      if (emp.check_in) processEntry(emp.check_in, 'Check-in');
      if (emp.check_out) processEntry(emp.check_out, 'Check-out');
    });

    // Sort newest first
    return list.sort((a, b) => b._sortTime - a._sortTime);
  }, [activity, employeeAttendance]);

  const filteredItems = useMemo(() => {
    return unifiedActivity.filter((item) => {
      if (filter === 'students') return item.role === 'Student';
      if (filter === 'employees') return item.role === 'Employee';
      if (filter === 'checkins') return item.action === 'Check-in';
      if (filter === 'checkouts') return item.action === 'Check-out';
      return true;
    });
  }, [unifiedActivity, filter]);

  return (
    <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4 relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Header & Filter Controls matching Screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Live Activity
            </h3>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/90 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Live ({filteredItems.length})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills matching Screenshot */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs">
              {[
                { id: 'all', label: 'All' },
                { id: 'students', label: 'Students' },
                { id: 'employees', label: 'Employees' },
                { id: 'checkins', label: 'Check-ins' },
                { id: 'checkouts', label: 'Check-outs' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id as any)}
                  className={cn(
                    'px-3.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap',
                    filter === f.id
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Scroll Buttons */}
            {filteredItems.length > 4 && (
              <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScroll('up')}
                  title="Scroll Up"
                  aria-label="Scroll Up"
                  className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                >
                  <Icon name="chevron-up" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('down')}
                  title="Scroll Down"
                  aria-label="Scroll Down"
                  className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
                >
                  <Icon name="chevron-down" size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Stream */}
        {filteredItems.length === 0 ? (
          <div className="py-14 text-center space-y-2 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Icon name="activity" size={24} className="text-purple-600" />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              No check-in / check-out events found.
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
              Once students or staff check in, their live activity will appear here.
            </p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1.5 scroll-smooth overscroll-contain relative z-10"
          >
            {filteredItems.map((item) => {
              // Generate initials purely from real name
              const initials = item.name
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              const isCheckout = item.action === 'Check-out';
              const isEmployee = item.role === 'Employee';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50/90 transition-all group border border-slate-100 hover:border-slate-200 bg-white shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs uppercase',
                        isEmployee
                          ? 'bg-gradient-to-tr from-indigo-600 to-purple-600'
                          : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                      )}>
                        {initials}
                      </div>
                      <div className={cn(
                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-2xs border border-white',
                        isCheckout ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                      )}>
                        <Icon name={isCheckout ? 'log-out' : 'log-in'} size={9} />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Real name */}
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {item.name}
                        </h4>

                        {/* Real ID */}
                        {item.studentId && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            ID: {item.studentId}
                          </span>
                        )}

                        {/* Role Badge */}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider',
                          isEmployee
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        )}>
                          {item.role}
                        </span>

                        {/* Check-in / Check-out Badge */}
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1',
                          isCheckout
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', isCheckout ? 'bg-amber-500' : 'bg-emerald-500')} />
                          {isCheckout ? 'Checked Out' : 'Checked In'}
                        </span>
                      </div>

                      {/* Device & Location */}
                      {(item.location || item.device) && (
                        <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5">
                          {item.location && (
                            <span className="font-semibold text-slate-700">{item.location}</span>
                          )}
                          {item.location && item.device && item.device.toLowerCase() !== item.location.toLowerCase() && (
                            <span className="text-slate-300">·</span>
                          )}
                          {item.device && item.device.toLowerCase() !== item.location.toLowerCase() && (
                            <span className="text-slate-400">{item.device}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 ml-3 text-right">
                    {item.time && (
                      <div className="text-xs font-mono font-bold text-slate-800 bg-slate-50 group-hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors shadow-2xs">
                        {item.time}
                      </div>
                    )}
                    {item.fullDateStr && (
                      <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                        {item.fullDateStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Soft bottom decorative wave matching screenshot */}
        <svg
          className="absolute -bottom-1 left-0 right-0 w-full h-16 pointer-events-none opacity-30 text-purple-200"
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

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs relative z-10">
        <span className="font-bold text-slate-500 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real-time biometric attendance sync active
        </span>
        <button
          type="button"
          onClick={() => navigate('/owner/members')}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 transition-all cursor-pointer"
        >
          <span>View All Activity</span>
          <Icon name="arrow-right" size={13} />
        </button>
      </div>
    </div>
  );
}
