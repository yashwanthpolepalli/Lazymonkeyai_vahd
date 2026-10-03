import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import type { LiveActivityItem } from '@/types/dashboard';
import { hrmsApi } from '@/services/hrmsApi';
import { cn } from '@/utils/cn';

interface LiveGymActivityProps {
  activity: LiveActivityItem[];
}

interface EnrichedActivityItem {
  id: string;
  role: 'Student' | 'Employee';
  action: 'Check-in' | 'Check-out' | 'Payment';
  name: string;
  customerId?: string;
  location: string;
  device: string;
  time: string;
  fullDateStr?: string;
  status: 'success' | 'warning' | 'info';
}

export function LiveGymActivity({ activity }: LiveGymActivityProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'students' | 'employees' | 'checkins' | 'checkouts'>('all');
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);

  useEffect(() => {
    hrmsApi.getAttendance()
      .then((res) => {
        if (Array.isArray(res)) {
          setEmployeeAttendance(res);
        }
      })
      .catch(() => {});
  }, []);

  const handleScroll = (direction: 'up' | 'down') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'up' ? -150 : 150;
      scrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  // Combine and unify student and employee live attendance logs from DB
  const unifiedActivity: EnrichedActivityItem[] = useMemo(() => {
    const list: EnrichedActivityItem[] = [];

    // 1. Process passed activity (Student & live biometric logs from DB)
    (activity || []).forEach((item) => {
      const dir = (item.direction || '').toUpperCase();
      const desc = item.description || '';
      const isLogout = dir.includes('OUT') || dir.includes('EXIT') || item.type === 'checkout' || desc.toLowerCase().includes('exit') || desc.toLowerCase().includes('out');
      const isStaff = (item.userRole && !item.userRole.toLowerCase().includes('cust') && !item.userRole.toLowerCase().includes('student')) || desc.toLowerCase().includes('staff') || desc.toLowerCase().includes('trainer');

      let timeFormatted = item.time;
      let fullDateStr = '';
      if (item.timestamp) {
        try {
          const d = new Date(item.timestamp);
          timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
          fullDateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (_e) {
          timeFormatted = item.time || 'Just now';
        }
      }

      list.push({
        id: item.id || `act-${Math.random()}`,
        role: isStaff ? 'Employee' : 'Student',
        action: isLogout ? 'Check-out' : 'Check-in',
        name: item.title?.replace(/Gym Member/i, 'Student') || 'Student Member',
        customerId: item.customerId || '',
        location: item.location || desc.split('·')[0]?.trim() || 'Main Branch',
        device: item.device || desc.split('·')[1]?.trim() || 'AI Face Terminal',
        time: timeFormatted,
        fullDateStr: fullDateStr,
        status: isLogout ? 'warning' : 'success',
      });
    });

    // 2. Process employee attendance logs (Check-in and Check-out from HRMS)
    employeeAttendance.forEach((emp) => {
      if (emp.check_in) {
        list.push({
          id: `emp-in-${emp.id}`,
          role: 'Employee',
          action: 'Check-in',
          name: emp.employee_name || 'Staff Member',
          customerId: emp.employee_id || emp.employee_code || (emp.id ? `EMP-${String(emp.id).slice(0, 6)}` : ''),
          location: emp.department || 'Operations',
          device: 'Geofence / ESS Portal',
          time: emp.check_in.includes(':') ? emp.check_in.slice(0, 8) : emp.check_in,
          fullDateStr: emp.date ? new Date(emp.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today',
          status: 'success',
        });
      }
      if (emp.check_out) {
        list.push({
          id: `emp-out-${emp.id}`,
          role: 'Employee',
          action: 'Check-out',
          name: emp.employee_name || 'Staff Member',
          customerId: emp.employee_id || emp.employee_code || (emp.id ? `EMP-${String(emp.id).slice(0, 6)}` : ''),
          location: emp.department || 'Operations',
          device: 'Geofence / ESS Portal',
          time: emp.check_out.includes(':') ? emp.check_out.slice(0, 8) : emp.check_out,
          fullDateStr: emp.date ? new Date(emp.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today',
          status: 'warning',
        });
      }
    });

    return list;
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
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-navy-100/60">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-navy-900 tracking-wider uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE GYM ACTIVITY</span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              • LIVE ({filteredItems.length})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-navy-100/70 p-1 rounded-xl border border-navy-200/50 text-[11px]">
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
                    'px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer',
                    filter === f.id
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-navy-500 hover:text-navy-900'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Vertical Scroll Buttons */}
            {filteredItems.length > 4 && (
              <div className="flex items-center gap-0.5 bg-navy-50 border border-navy-100 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScroll('up')}
                  title="Scroll Up"
                  className="p-1 rounded-md text-navy-500 hover:text-navy-900 hover:bg-white transition-all cursor-pointer"
                  aria-label="Scroll Up"
                >
                  <Icon name="chevron-up" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('down')}
                  title="Scroll Down"
                  className="p-1 rounded-md text-navy-500 hover:text-navy-900 hover:bg-white transition-all cursor-pointer"
                  aria-label="Scroll Down"
                >
                  <Icon name="chevron-down" size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Stream */}
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-xs font-semibold text-navy-400 space-y-1">
            <Icon name="activity" size={24} className="mx-auto text-navy-300 mb-2" />
            <div>No live activity events matching filter recorded today.</div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1.5 scroll-smooth overscroll-contain"
          >
            {filteredItems.map((item) => {
              const initials = (item.name || 'U')
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U';

              const isCheckout = item.action === 'Check-out';
              const isEmployee = item.role === 'Employee';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-navy-50/90 transition-all group border border-navy-100/70 hover:border-navy-200 bg-white shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Avatar with Status Indicator */}
                    <div className="relative shrink-0">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs uppercase',
                        isEmployee ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
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

                    {/* Member Details */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-extrabold text-navy-900 group-hover:text-brand-600 transition-colors truncate">
                          {item.name}
                        </h4>

                        {/* Customer / Member ID from DB */}
                        {item.customerId && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-navy-100/80 text-navy-700 border border-navy-200/70">
                            ID: {item.customerId}
                          </span>
                        )}

                        {/* Role Tag */}
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider',
                          isEmployee ? 'bg-purple-50 text-purple-700 border border-purple-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        )}>
                          {item.role}
                        </span>

                        {/* Check-in / Check-out Status Badge */}
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1',
                          isCheckout 
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/80' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', isCheckout ? 'bg-amber-500' : 'bg-emerald-500')} />
                          {isCheckout ? 'Checked Out' : 'Checked In'}
                        </span>
                      </div>

                      {/* Device & Location Information */}
                      <p className="text-[11px] font-medium text-navy-500 truncate flex items-center gap-1.5">
                        <span className="font-semibold text-navy-700">{item.location}</span>
                        <span className="text-navy-300">·</span>
                        <span className="text-navy-400">{item.device}</span>
                      </p>
                    </div>
                  </div>

                  {/* DB Timestamp Display */}
                  <div className="shrink-0 ml-3 text-right">
                    <div className="text-xs font-mono font-bold text-navy-800 bg-navy-50/90 group-hover:bg-white px-2.5 py-1 rounded-lg border border-navy-100 group-hover:border-navy-200 transition-colors shadow-2xs">
                      {item.time}
                    </div>
                    {item.fullDateStr && (
                      <span className="text-[10px] font-medium text-navy-400 block mt-0.5">
                        {item.fullDateStr}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="pt-3 border-t border-navy-100/80 flex items-center justify-between text-xs">
        <span className="font-bold text-navy-400 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Real-time biometric attendance sync active
        </span>

        <button
          type="button"
          onClick={() => navigate('/owner/members')}
          className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1 transition-all cursor-pointer"
        >
          <span>View All Activity</span>
          <Icon name="arrow-right" size={13} />
        </button>
      </div>
    </div>
  );
}
