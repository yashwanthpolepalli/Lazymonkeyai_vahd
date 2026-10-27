import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { LineChart, BarChart } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { Member } from '@/types';

export function ProgressPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.customers.list().then((data) => { setMembers(data.slice(0, 6)); setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Progress" breadcrumb={['employee', 'Progress']} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Overall Attendance Consistency</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <LineChart data={[65, 68, 72, 75, 78, 82, 85, 87]} labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']} height={200} color="#2563eb" />
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Class Engagement Progress</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <LineChart data={[72, 74, 76, 79, 81, 84, 86, 89]} labels={['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']} height={200} color="#059669" />
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Individual Student Progress</h3>
        {loading ? <Skeleton className="h-48 w-full" /> : (
          <div className="space-y-4">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl bg-navy-50 hover:bg-navy-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">{m.name.split(' ').map(n => n[0]).join('')}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-navy-900">{m.name}</div>
                  <div className="text-xs text-navy-400">{m.membership} · {m.attendance}% attendance</div>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-center">
                  <div><div className="text-sm font-bold text-navy-900">{m.branch}</div><div className="text-[10px] text-navy-400">Branch</div></div>
                  <div><div className="text-sm font-bold text-navy-900">{m.attendance}%</div><div className="text-[10px] text-navy-400">Rate</div></div>
                </div>
                <Badge variant="success">On Track</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Session Attendance Rate</h3>
        {loading ? <Skeleton className="h-48 w-full" /> : (
          <BarChart data={[78, 82, 85, 88, 92, 87]} labels={members.slice(0, 6).map((m) => m.name.split(' ')[0])} height={200} color="#9333ea" highlightLast={false} />
        )}
      </div>
    </div>
  );
}
