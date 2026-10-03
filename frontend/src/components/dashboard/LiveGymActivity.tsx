import { useState, useEffect, useRef, useMemo } from 'react';
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
  action: 'Login' | 'Logout' | 'Check-in' | 'Check-out' | 'Payment';
  name: string;
  location: string;
  device: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

export function LiveGymActivity({ activity }: LiveGymActivityProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'students' | 'employees' | 'logins' | 'logouts'>('all');
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

  // Combine and unify student and employee live attendance logs
  const unifiedActivity: EnrichedActivityItem[] = useMemo(() => {
    const list: EnrichedActivityItem[] = [];

    // 1. Process passed activity (Student check-ins & biometrics)
    (activity || []).forEach((item) => {
      const desc = item.description || '';
      const isLogout = desc.toLowerCase().includes('exit') || desc.toLowerCase().includes('out') || desc.toLowerCase().includes('logout');
      const isCheckin = item.type === 'checkin' || desc.toLowerCase().includes('scanner') || desc.toLowerCase().includes('face');

      list.push({
        id: item.id || `act-${Math.random()}`,
        role: desc.toLowerCase().includes('staff') || desc.toLowerCase().includes('trainer') ? 'Employee' : 'Student',
        action: isLogout ? 'Logout' : isCheckin ? 'Login' : 'Payment',
        name: item.title?.replace(/Gym Member/i, 'Student') || 'Student Member',
        location: desc.split('·')[0]?.trim() || 'Main Branch',
        device: desc.split('·')[1]?.trim() || 'AI Face Terminal',
        time: item.time || 'Just now',
        status: isLogout ? 'warning' : 'success',
      });
    });

    // 2. Process employee attendance logs (Check-in and Check-out)
    employeeAttendance.forEach((emp) => {
      if (emp.check_in) {
        list.push({
          id: `emp-in-${emp.id}`,
          role: 'Employee',
          action: 'Login',
          name: emp.employee_name || 'Staff Member',
          location: emp.department || 'Operations',
          device: 'Geofence / ESS Portal',
          time: emp.check_in.includes(':') ? emp.check_in.slice(0, 5) : emp.check_in,
          status: 'success',
        });
      }
      if (emp.check_out) {
        list.push({
          id: `emp-out-${emp.id}`,
          role: 'Employee',
          action: 'Logout',
          name: emp.employee_name || 'Staff Member',
          location: emp.department || 'Operations',
          device: 'Geofence / ESS Portal',
          time: emp.check_out.includes(':') ? emp.check_out.slice(0, 5) : emp.check_out,
          status: 'warning',
        });
      }
    });

    // Sort or return deduplicated list
    return list;
  }, [activity, employeeAttendance]);

  const filteredItems = useMemo(() => {
    return unifiedActivity.filter((item) => {
      if (filter === 'students') return item.role === 'Student';
      if (filter === 'employees') return item.role === 'Employee';
      if (filter === 'logins') return item.action === 'Login' || item.action === 'Check-in';
      if (filter === 'logouts') return item.action === 'Logout' || item.action === 'Check-out';
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
              <span>LIVE ACTIVITY</span>
            </h3>
            <span className="text-[11px] text-navy-400 font-bold bg-navy-50 px-2 py-0.5 rounded-full">
              {filteredItems.length} Events
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-navy-100/70 p-1 rounded-xl border border-navy-200/50 text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'students', label: 'Students' },
                { id: 'employees', label: 'Employees' },
                { id: 'logins', label: 'Logins' },
                { id: 'logouts', label: 'Logouts' },
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
            {filteredItems.length > 5 && (
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
            className="max-h-[360px] overflow-y-auto space-y-2 pr-1.5 scroll-smooth overscroll-contain"
          >
            {filteredItems.map((item) => {
              const initials = (item.name || 'U')
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U';

              const isLogout = item.action === 'Logout' || item.action === 'Check-out';
              const isEmployee = item.role === 'Employee';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-navy-50/80 transition-colors group border border-navy-50 hover:border-navy-100 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-xs shadow-xs uppercase',
                        isEmployee ? 'bg-gradient-to-tr from-purple-600 to-indigo-600' : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                      )}>
                        {initials}
                      </div>
                      <div className={cn(
                        'absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] shadow-2xs border border-white',
                        isLogout ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                      )}>
                        <Icon name={isLogout ? 'log-out' : 'log-in'} size={9} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors truncate">
                          {item.name}
                        </h4>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider',
                          isEmployee ? 'bg-purple-50 text-purple-700 border border-purple-200/60' : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                        )}>
                          {item.role}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider',
                          isLogout ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        )}>
                          {item.action}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-navy-500 truncate mt-0.5">
                        {item.location} · <span className="text-navy-400 font-normal">{item.device}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3 text-right">
                    <span className="text-xs font-mono font-bold text-navy-600 bg-navy-50 px-2 py-1 rounded-lg border border-navy-100">
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2.5 border-t border-navy-100/80 text-center">
        <span className="text-xs font-bold text-navy-400 inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Real-time biometric attendance sync active
        </span>
      </div>
    </div>
  );
}
