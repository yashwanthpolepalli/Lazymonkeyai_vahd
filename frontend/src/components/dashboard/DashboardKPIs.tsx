import { Icon } from '@/components/ui/Icon';
import type { KpiSummary } from '@/types/dashboard';

interface DashboardKPIsProps {
  summary: KpiSummary;
}

export function DashboardKPIs({ summary }: DashboardKPIsProps) {
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const kpis = [
    {
      id: 'members',
      label: 'TOTAL MEMBERS',
      value: (summary?.total_members ?? 0).toLocaleString(),
      change: '↑ vs last month',
      isUp: true,
      icon: 'users',
      accentColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'checkins',
      label: 'CHECK-INS TODAY',
      value: (summary?.checkins_today ?? 0).toLocaleString(),
      change: '↑ vs yesterday',
      isUp: true,
      icon: 'check-circle-2',
      accentColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'active',
      label: 'ACTIVE MEMBERSHIPS',
      value: (summary?.active_memberships ?? 0).toLocaleString(),
      change: '↑ vs last month',
      isUp: true,
      icon: 'user-check',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      id: 'expiring',
      label: 'EXPIRING SOON',
      value: (summary?.expiring_soon ?? 0).toLocaleString(),
      change: '↓ vs last month',
      isUp: false,
      icon: 'clock',
      accentColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      id: 'revenue',
      label: "TODAY'S REVENUE",
      value: formatINR(summary?.today_revenue ?? 0),
      change: '↑ vs yesterday',
      isUp: true,
      icon: 'indian-rupee',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-navy-400">{kpi.label}</span>
              <div className="text-2xl font-black text-navy-900 tracking-tight mt-1">{kpi.value}</div>
            </div>
            <div className={`w-10 h-10 rounded-full ${kpi.bgColor} ${kpi.accentColor} flex items-center justify-center shrink-0 shadow-xs`}>
              <Icon name={kpi.icon} size={20} />
            </div>
          </div>

          <div className="mt-3">
            <div className={`text-xs font-bold ${kpi.isUp ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1`}>
              {kpi.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
