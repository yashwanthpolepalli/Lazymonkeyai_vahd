import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { LineChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import { TrainerGeofencePunchWidget } from '@/components/trainer/TrainerGeofencePunchWidget';
import type { KpiCard as KpiType, Member } from '@/types';
import { cn } from '@/utils/cn';

export function TrainerDashboard() {
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [aiAlerts, setAiAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.trainerKpis().catch(() => []),
      api.customers.list().catch(() => []),
      api.aiCoach.recommendations().catch(() => []),
    ]).then(([k, m, recs]) => {
      setKpis(k);
      setMembers((m || []).slice(0, 6));

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
      <PageHeader title="Trainer Dashboard" breadcrumb={['Trainer', 'Dashboard']} />

      {/* Trainer Shift Geofenced Punch Center */}
      <TrainerGeofencePunchWidget />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpis.map((k, i) => <KpiCard key={k.id || k.label || i} {...k} />)}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-bold text-navy-900 mb-4">Customer Attendance & Progress</h3>
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
