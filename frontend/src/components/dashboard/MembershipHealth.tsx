import { Icon } from '@/components/ui/Icon';
import type { MembershipHealthBreakdown } from '@/types/dashboard';

interface MembershipHealthProps {
  health: MembershipHealthBreakdown;
  onViewDetails?: () => void;
}

export function MembershipHealth({ health, onViewDetails }: MembershipHealthProps) {
  const activeCount = health?.active ?? 0;
  const expiringCount = health?.expiring ?? 0;
  const expiredCount = health?.expired ?? 0;
  const inactiveCount = health?.inactive ?? 0;
  const total = activeCount + expiringCount + expiredCount + inactiveCount;
  const safeTotal = total > 0 ? total : 1;

  const items = [
    {
      label: 'Active Members',
      count: activeCount,
      percentage: total > 0 ? Math.round((activeCount / safeTotal) * 100) : 0,
      icon: 'check-circle-2',
      iconBg: 'bg-emerald-500 text-white',
      barColor: 'bg-emerald-500',
    },
    {
      label: 'Expiring Soon',
      count: expiringCount,
      percentage: total > 0 ? Math.round((expiringCount / safeTotal) * 100) : 0,
      icon: 'clock',
      iconBg: 'bg-orange-500 text-white',
      barColor: 'bg-orange-500',
    },
    {
      label: 'Expired',
      count: expiredCount,
      percentage: total > 0 ? Math.round((expiredCount / safeTotal) * 100) : 0,
      icon: 'x-circle',
      iconBg: 'bg-rose-500 text-white',
      barColor: 'bg-rose-500',
    },
    {
      label: 'Inactive',
      count: inactiveCount,
      percentage: total > 0 ? Math.round((inactiveCount / safeTotal) * 100) : 0,
      icon: 'pause-circle',
      iconBg: 'bg-slate-400 text-white',
      barColor: 'bg-slate-400',
    },
  ];

  return (
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-navy-900 tracking-wider uppercase">MEMBERSHIP STATUS</h3>
          {onViewDetails && (
            <button onClick={onViewDetails} className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors">
              View Details
            </button>
          )}
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon name={item.icon} size={12} />
                  </div>
                  <span className="font-bold text-navy-900">{item.label}</span>
                </div>
                <span className="font-extrabold text-navy-900">
                  {item.count.toLocaleString()} <span className="font-medium text-navy-400">({item.percentage}%)</span>
                </span>
              </div>
              <div className="w-full h-2 bg-navy-50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-navy-100 flex items-center justify-between">
        <span className="text-xs font-bold text-navy-500">Total</span>
        <span className="text-sm font-black text-navy-900">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}
