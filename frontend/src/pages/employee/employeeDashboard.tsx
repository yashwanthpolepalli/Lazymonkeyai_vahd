import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { LineChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/services/api';
import { EmployeeGeofencePunchWidget } from '@/components/employee/employeeGeofencePunchWidget';
import type { KpiCard as KpiType, Member } from '@/types';
import { cn } from '@/utils/cn';

export function EmployeeDashboard() {
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.dashboard.employeeKpis().catch(() => []),
      api.students.list().catch(() => []),
    ]).then(([k, m]) => {
      setKpis(k);
      setMembers((m || []).slice(0, 6));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="employee Dashboard" breadcrumb={['employee', 'Dashboard']} />

      {/* employee Shift Geofenced Punch Center */}
      <EmployeeGeofencePunchWidget />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpis.map((k, i) => <KpiCard key={k.id || k.label || i} {...k} />)}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h3 className="text-base font-bold text-navy-900 mb-4">student Attendance & Progress</h3>
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
            <h3 className="text-base font-bold text-navy-900 mb-4">Assigned students</h3>
            {loading ? <Skeleton className="h-48 w-full" /> : members.length === 0 ? (
              <EmptyState title="No Assigned students" description="students assigned to your employee profile will appear here." icon="users" />
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-navy-50">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{m.name.split(' ').map((n: string) => n[0]).join('')}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-navy-900 truncate">{m.name}</div>
                      <div className="text-xs text-navy-400">{m.membership || 'Active Member'} · {m.attendance || 100}% attendance</div>
                    </div>
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

export const employeeDashboard = EmployeeDashboard;
