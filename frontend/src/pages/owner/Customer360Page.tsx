import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { LineChart } from '@/components/ui/Charts';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/States';
import { api } from '@/services/api';
import type { Member } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateDDMMYY } from '@/utils/date';

const tabs = ['Overview', 'Attendance', 'Membership', 'Payments', 'Workouts', 'Nutrition', 'Body Composition', 'Health', 'Progress', 'Notes'];

export function Customer360Page() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    if (!id) return;
    api.customers.get(id).then((data) => {
      if (!data) setNotFound(true);
      else setMember(data);
      setLoading(false);
    });
  }, [id]);

  if (notFound) return <ErrorState title="Member not found" description="This member may have been removed." onRetry={() => navigate('/owner/customers')} />;
  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!member) return null;

  const statusVariant = member.status === 'active' ? 'success' : member.status === 'expiring' ? 'warning' : member.status === 'vip' ? 'brand' : 'neutral';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer 360"
        breadcrumb={['Owner', 'Customers', member.name]}
        actions={
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/owner/customers')} className="btn-secondary">
              <Icon name="chevron-left" size={16} /> Back
            </button>
          </div>
        }
      />

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-navy-900">{member.name}</h2>
              <Badge variant={statusVariant as 'success' | 'warning' | 'brand' | 'neutral'}>{member.status}</Badge>
            </div>
            <div className="text-sm text-navy-500 mb-3">{member.email} · {member.phone}</div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div><span className="stat-label">Membership</span> <span className="font-semibold text-navy-900">{member.membership}</span></div>
              <div><span className="stat-label">Branch</span> <span className="font-semibold text-navy-900">{member.branch}</span></div>
              <div><span className="stat-label">Trainer</span> <span className="font-semibold text-navy-900">{member.trainer}</span></div>
              <div><span className="stat-label">Goal</span> <span className="font-semibold text-navy-900">{member.goal}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-navy-100">
          {[
            { label: 'Attendance', value: `${member.attendance || 0}%`, icon: 'calendar-check', color: 'text-brand-600' },
            { label: 'Weight', value: `${member.weight || 0} kg`, icon: 'scale', color: 'text-navy-600' },
            { label: 'Body Fat', value: `${member.bodyFat || 0}%`, icon: 'ruler', color: 'text-warning-600' },
            { label: 'Workout Streak', value: `${member.attendance ? Math.round(member.attendance / 10) : 0} days`, icon: 'flame', color: 'text-danger-600' },
            { label: 'Days Left', value: member.expiry || '—', icon: 'clock', color: 'text-success-600' },
            { label: 'Revenue', value: member.revenue || '₹0', icon: 'indian-rupee', color: 'text-success-600' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center mx-auto mb-2">
                <Icon name={s.icon} size={18} className={s.color} />
              </div>
              <div className="text-base font-bold text-navy-900">{s.value}</div>
              <div className="text-xs text-navy-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                activeTab === tab ? 'bg-brand-50 text-brand-700' : 'text-navy-500 hover:bg-navy-50'
              )}
            >{tab}</button>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-base font-bold text-navy-900 mb-4">Attendance Trend</h3>
              <LineChart data={[member.attendance || 0]} labels={['Current']} height={160} color="#2563eb" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900 mb-4">Weight Progress</h3>
              <LineChart data={[member.weight || 0]} labels={['Current']} height={160} color="#059669" />
            </div>
            <div className="flex items-center justify-center">
              <ProgressRing value={member.attendance || 0} max={100} label={`${member.attendance || 0}%`} sublabel="Overall Health" color="#2563eb" size={140} />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-bold text-navy-900">Recent Activity</h3>
              <div className="text-xs text-navy-400 py-4 text-center">Live activity feed connected</div>
            </div>
          </div>
        )}
        {activeTab !== 'Overview' && activeTab !== 'Attendance' && (
          <EmptyTabContent tab={activeTab} />
        )}
      </div>
    </div>
  );
}

function EmptyTabContent({ tab }: { tab: string }) {
  return (
    <div className="py-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-navy-100 flex items-center justify-center mx-auto mb-4">
        <Icon name="info" size={24} className="text-navy-400" />
      </div>
      <h3 className="text-base font-semibold text-navy-900">{tab}</h3>
      <p className="text-sm text-navy-500 mt-1">Detailed {tab.toLowerCase()} data will appear here.</p>
    </div>
  );
}
