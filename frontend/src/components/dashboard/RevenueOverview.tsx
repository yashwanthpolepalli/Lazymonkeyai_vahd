import { Icon } from '@/components/ui/Icon';
import type { RevenueBreakdownData } from '@/types/dashboard';

interface RevenueOverviewProps {
  revenue: RevenueBreakdownData;
}

export function RevenueOverview({ revenue }: RevenueOverviewProps) {
  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const memberships = revenue?.memberships ?? 0;
  const pt = revenue?.pt ?? 0;
  const pos = revenue?.pos ?? 0;
  const other = revenue?.other ?? 0;
  const total = memberships + pt + pos + other;
  const safeTotal = total > 0 ? total : 1;

  const streams = [
    {
      label: 'Memberships',
      amount: memberships,
      percentage: total > 0 ? Math.round((memberships / safeTotal) * 100) : 0,
      icon: 'credit-card',
      iconBg: 'bg-blue-50 text-blue-600',
      barColor: 'bg-blue-600',
    },
    {
      label: 'PT Sessions',
      amount: pt,
      percentage: total > 0 ? Math.round((pt / safeTotal) * 100) : 0,
      icon: 'users',
      iconBg: 'bg-cyan-50 text-cyan-600',
      barColor: 'bg-cyan-500',
    },
    {
      label: 'POS Sales',
      amount: pos,
      percentage: total > 0 ? Math.round((pos / safeTotal) * 100) : 0,
      icon: 'shopping-bag',
      iconBg: 'bg-purple-50 text-purple-600',
      barColor: 'bg-purple-600',
    },
    {
      label: 'Other Income',
      amount: other,
      percentage: total > 0 ? Math.round((other / safeTotal) * 100) : 0,
      icon: 'wallet',
      iconBg: 'bg-emerald-50 text-emerald-600',
      barColor: 'bg-emerald-500',
    },
  ];

  return (
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-navy-900 tracking-wider uppercase">TODAY&apos;S REVENUE OVERVIEW</h3>
          <select className="input-field !py-1 !px-2.5 text-xs font-semibold sm:w-auto bg-navy-50 border-navy-200">
            <option>This Month</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Quarter</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 space-y-1">
            <div className="text-3xl font-black text-navy-900 tracking-tight">{formatINR(total)}</div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              ↑ vs last month
            </div>
          </div>

          <div className="md:col-span-7 space-y-3">
            {streams.map((stream) => (
              <div key={stream.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md ${stream.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon name={stream.icon} size={11} />
                    </div>
                    <span className="font-bold text-navy-800">{stream.label}</span>
                  </div>
                  <span className="font-extrabold text-navy-900">
                    {formatINR(stream.amount)}{' '}
                    <span className="font-medium text-navy-400">({stream.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-navy-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stream.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${stream.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-navy-100 text-center">
        <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
          View Financial Report <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  );
}
