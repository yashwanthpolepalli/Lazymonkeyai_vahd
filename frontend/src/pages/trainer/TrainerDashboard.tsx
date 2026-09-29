import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LineChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import { customerApi, GymSlotBookingItem } from '@/services/customerApi';
import { TrainerGeofencePunchWidget } from '@/components/trainer/TrainerGeofencePunchWidget';
import type { KpiCard as KpiType, Member } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateDDMMYY } from '@/utils/date';

export function TrainerDashboard() {
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [slotBookings, setSlotBookings] = useState<GymSlotBookingItem[]>([]);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.trainerKpis().catch(() => []),
      api.customers.list().catch(() => []),
      api.workouts.todaySessions().catch(() => []),
      api.aiCoach.recommendations().catch(() => []),
      customerApi.getAllSlotBookings().catch(() => []),
    ]).then(([k, m, s, recs, slots]) => {
      setKpis(k);
      setMembers((m || []).slice(0, 6));
      setSessions(s || []);
      setSlotBookings(slots || []);

      if (Array.isArray(recs) && recs.length > 0) {
        const formatted = recs.map((r: any) => ({
          text: r.insight || r.suggested_action || r.title || 'Client progression optimal',
          severity: r.priority || 'medium',
        }));
        setAiAlerts(formatted);
      } else {
        setAiAlerts([]);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Trainer Dashboard" breadcrumb={['Trainer', 'Dashboard']} actions={<button className="btn-primary"><Icon name="plus" size={16} /> Assign Workout</button>} />

      {/* Trainer Shift Geofenced Punch Center */}
      <TrainerGeofencePunchWidget />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpis.map((k) => <KpiCard key={k.id} {...k} />)}</div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-bold text-navy-900 mb-4">Today's Sessions</h3>
            {loading ? <Skeleton className="h-32 w-full" /> : sessions.length === 0 ? (
              <EmptyState
                title="No Sessions Scheduled Today"
                description="Your assigned customer workout sessions will appear here when scheduled."
                icon="calendar"
              />
            ) : (
              <div className="space-y-2">
                {sessions.map((s, i) => {
                  const sName = s.name || s.customer_name || '';
                  const sTime = s.time || s.start_time || '';
                  const initials = sName ? sName.split(' ').map((n: string) => n[0]).join('').slice(0, 2) : 'M';
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-navy-50 transition-colors">
                      <div className="text-center w-16 shrink-0">
                        <div className="text-sm font-bold text-navy-900">{sTime ? sTime.split(' ')[0] : '—'}</div>
                        <div className="text-xs text-navy-400">{sTime ? sTime.split(' ')[1] || '' : ''}</div>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy-900">{sName}</div>
                        <div className="text-xs text-navy-400">{s.type || s.workout_type || ''}{s.duration ? ` · ${s.duration}` : ''}</div>
                      </div>
                      {s.status && <Badge variant="brand" dot>{s.status}</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Gym Slot Bookings Floor Schedule */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-navy-900">Customer Gym Slot Bookings</h3>
                <p className="text-xs text-navy-400">Live floor reservations & targeted workout muscle groups</p>
              </div>
              <Badge variant="brand">{slotBookings.length} Slots</Badge>
            </div>

            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : slotBookings.length === 0 ? (
              <EmptyState
                title="No Customer Slot Bookings"
                description="When members book workout slots with muscle targets, they will appear dynamically here."
                icon="calendar"
              />
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {slotBookings.map((slot) => {
                  const name = slot.customer_name || 'Member';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                  return (
                    <div
                      key={slot.id}
                      className="p-3.5 rounded-2xl bg-navy-50/60 hover:bg-navy-50 border border-navy-100 hover:border-brand-200 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-navy-900">{name}</div>
                            <div className="text-[11px] text-navy-500 font-medium">
                              {slot.customer_phone || slot.customer_email || '—'} · {slot.branch_name || 'Main Branch'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-brand-600 flex items-center gap-1 justify-end">
                            <Icon name="clock" size={13} />
                            {slot.start_time} - {slot.end_time}
                          </div>
                          <div className="text-[11px] text-navy-400 font-medium">
                            {formatDateDDMMYY(slot.booking_date)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-navy-100/60">
                        <div className="flex flex-wrap gap-1">
                          {(slot.workout_types || []).map((wt, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-brand-700 border border-brand-200/80 shadow-xs"
                            >
                              {wt}
                            </span>
                          ))}
                        </div>
                        <Badge variant={slot.status === 'CONFIRMED' ? 'success' : slot.status === 'CANCELLED' ? 'danger' : 'brand'}>
                          {slot.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-base font-bold text-navy-900 mb-4">Customer Progress</h3>
            {loading ? <Skeleton className="h-48 w-full" /> : (() => {
              const progressData = members.length > 0
                ? members.map((m) => Number(m.attendance) || 0)
                : [];
              const progressLabels = members.length > 0
                ? members.map((m) => (m.name || 'Member').split(' ')[0])
                : [];
              return (
                <LineChart
                  data={progressData}
                  labels={progressLabels}
                  height={180}
                  color="#059669"
                />
              );
            })()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-bold text-navy-900 mb-4">Assigned Customers</h3>
            {loading ? <Skeleton className="h-48 w-full" /> : members.length === 0 ? (
              <EmptyState title="No Assigned Customers" description="Customers assigned to your trainer profile will appear here." icon="users" />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-navy-50">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{m.name.split(' ').map((n: string) => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-900 truncate">{m.name}</div>
                      <div className="text-xs text-navy-400">{m.goal || 'General Fitness'} · {m.attendance || 100}% attendance</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 bg-gradient-to-br from-ai-50/50 to-white">
            <div className="flex items-center gap-2 mb-4"><Icon name="sparkles" size={18} className="text-ai-600" /><h3 className="text-base font-bold text-navy-900">AI Alerts</h3></div>
            {aiAlerts.length === 0 ? (
              <div className="text-xs text-navy-400 text-center py-4">No active AI alerts. Client progress is optimal.</div>
            ) : (
              <div className="space-y-2">
                {aiAlerts.map((a, i) => (
                  <div key={i} className={cn('flex gap-2 p-3 rounded-xl', a.severity === 'high' ? 'bg-danger-50' : a.severity === 'medium' ? 'bg-warning-50' : 'bg-success-50')}>
                    <Icon name={a.severity === 'high' ? 'alert-triangle' : a.severity === 'medium' ? 'alert-circle' : 'check-circle'} size={16} className={a.severity === 'high' ? 'text-danger-600' : a.severity === 'medium' ? 'text-warning-600' : 'text-success-600'} />
                    <span className="text-sm text-navy-700">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
