import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/States';
import { api } from '@/services/api';
import { customerApi, GymSlotBookingItem } from '@/services/customerApi';
import { cn } from '@/utils/cn';
import { formatDateDDMMYY, getTodayISO, normalizeDateToISO } from '@/utils/date';

export function TodaysWorkoutsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [slotBookings, setSlotBookings] = useState<GymSlotBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'slots' | 'sessions'>('slots');

  useEffect(() => {
    Promise.all([
      api.workouts.todaySessions().catch(() => []),
      customerApi.getAllSlotBookings().catch(() => []),
    ]).then(([data, slots]) => {
      if (data && Array.isArray(data)) {
        const formatted = data.map((s) => ({
          id: s.id,
          time: s.time || s.start_time || '',
          name: s.name || s.customer_name || s.full_name || '',
          type: s.type || s.workout_type || (Array.isArray(s.workout_types) ? s.workout_types.join(', ') : '') || '',
          duration: s.duration || '',
          status: (s.status || '').toLowerCase(),
        }));
        setSessions(formatted);
      }
      setSlotBookings(slots || []);
      setLoading(false);
    });
  }, []);

  const todayIso = getTodayISO();
  const todaysSlots = slotBookings.filter((s) => normalizeDateToISO(s.booking_date) === todayIso);
  const totalSlotsCount = slotBookings.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floor Workouts & Slot Bookings"
        breadcrumb={['Trainer', "Workouts & Slots"]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => customerApi.getAllSlotBookings().then(setSlotBookings)}
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <Icon name="refresh-cw" size={14} /> Refresh
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Today's Booked Slots</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon name="calendar" size={16} className="text-brand-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{todaysSlots.length}</div>
            <div className="text-xs text-navy-400 mt-1">customer floor slots today</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Total Reservations</span>
              <div className="w-8 h-8 rounded-lg bg-ai-50 flex items-center justify-center">
                <Icon name="layers" size={16} className="text-ai-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-ai-600">{totalSlotsCount}</div>
            <div className="text-xs text-navy-400 mt-1">all scheduled bookings</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Active Workouts</span>
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                <Icon name="activity" size={16} className="text-success-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-success-600">{todaysSlots.filter(s => s.status === 'CONFIRMED').length}</div>
            <div className="text-xs text-navy-400 mt-1">confirmed for today</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Guided Sessions</span>
              <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                <Icon name="clock" size={16} className="text-warning-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-warning-600">{sessions.length}</div>
            <div className="text-xs text-navy-400 mt-1">trainer led sessions</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-navy-100/60 rounded-2xl w-fit border border-navy-200/50">
        <button
          onClick={() => setActiveTab('slots')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'slots'
              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-glow'
              : 'text-navy-600 hover:text-navy-900'
          )}
        >
          <Icon name="calendar" size={16} />
          <span>Customer Gym Slot Bookings</span>
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', activeTab === 'slots' ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600')}>
            {slotBookings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
            activeTab === 'sessions'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-navy-600 hover:text-navy-900'
          )}
        >
          <Icon name="users" size={16} />
          <span>Guided Sessions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-navy-100 text-navy-600 font-bold">
            {sessions.length}
          </span>
        </button>
      </div>

      {activeTab === 'slots' ? (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-navy-100">
            <div>
              <h3 className="text-base font-bold text-navy-900">Live Customer Gym Floor Bookings</h3>
              <p className="text-xs text-navy-400">Time slots AM/PM, assigned date & multi-selected target muscle groups</p>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : slotBookings.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No Slot Bookings Found"
              description="Customer gym slot bookings will appear dynamically here in real-time."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slotBookings.map((slot) => {
                const name = slot.customer_name || 'Member';
                const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                return (
                  <div
                    key={slot.id}
                    className="p-4 rounded-2xl bg-white border border-navy-200/80 hover:border-brand-300 hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-navy-900">{name}</div>
                          <div className="text-xs text-navy-400">{slot.customer_phone || slot.customer_email || '—'}</div>
                        </div>
                      </div>
                      <Badge variant={slot.status === 'CONFIRMED' ? 'success' : slot.status === 'CANCELLED' ? 'danger' : 'brand'}>
                        {slot.status}
                      </Badge>
                    </div>

                    <div className="p-2.5 rounded-xl bg-navy-50/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-navy-800">
                        <Icon name="calendar" size={14} className="text-brand-600" />
                        {formatDateDDMMYY(slot.booking_date)}
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-brand-600">
                        <Icon name="clock" size={14} />
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-1.5">Focus Muscles / Workouts</div>
                      <div className="flex flex-wrap gap-1.5">
                        {(slot.workout_types || []).map((wt, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200/60"
                          >
                            {wt}
                          </span>
                        ))}
                        {(!slot.workout_types || slot.workout_types.length === 0) && (
                          <span className="text-xs text-navy-400">General Floor Session</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-navy-100 flex items-center justify-between text-xs text-navy-500">
                      <span className="flex items-center gap-1">
                        <Icon name="map-pin" size={12} className="text-navy-400" />
                        {slot.branch_name || slot.branch || ''}
                      </span>
                      {slot.notes && (
                        <span className="text-navy-400 italic text-[11px] truncate max-w-[120px]">
                          "{slot.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Session Timeline</h3>
          <div className="space-y-3">
            {sessions.map((s, i) => {
              const displayName = s.name || '';
              const initials = displayName ? displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'M';
              return (
                <div key={s.id || i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-navy-50 transition-colors group">
                  <div className="text-center w-16 shrink-0">
                    <div className="text-sm font-bold text-navy-900">{s.time ? s.time.split(' ')[0] : '—'}</div>
                    <div className="text-xs text-navy-400">{s.time ? s.time.split(' ')[1] || '' : ''}</div>
                  </div>
                  <div className="w-px h-12 bg-navy-200" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-navy-900">{displayName}</div>
                    <div className="text-xs text-navy-400">{s.type}{s.duration ? ` · ${s.duration}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.status && <Badge variant={s.status === 'completed' ? 'success' : 'brand'} dot>{s.status}</Badge>}
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && !loading && (
              <div className="text-xs text-navy-400 text-center py-6">No scheduled sessions for today</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
