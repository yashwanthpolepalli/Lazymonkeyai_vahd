import { Icon } from '@/components/ui/Icon';
import type { AttentionMetrics } from '@/types/dashboard';
import { cn } from '@/utils/cn';

interface AIAttentionProps {
  attention: AttentionMetrics;
  onNavigate?: (module: string) => void;
}

export function AIAttention({ attention, onNavigate }: AIAttentionProps) {
  const churnCount = attention?.churn_risk ?? 0;
  const expiringCount = attention?.expiring_memberships ?? 0;
  const renewalsCount = attention?.pending_renewals ?? 0;
  const leadCount = attention?.lead_followups ?? 0;

  const items = [
    {
      id: 'churn',
      count: churnCount,
      title: `${churnCount} members at high churn risk`,
      subtitle: 'Not visited in last 7 days',
      icon: 'alert-triangle',
      iconBg: 'bg-rose-500 text-white',
      cardBg: 'bg-rose-50/40 hover:bg-rose-50 border-rose-100/90',
      badgeBg: 'bg-rose-100/90 text-rose-700',
      module: 'students',
    },
    {
      id: 'expiring',
      count: expiringCount,
      title: `${expiringCount} memberships expiring within 7 days`,
      subtitle: 'Reach out for renewal',
      icon: 'clock',
      iconBg: 'bg-amber-500 text-white',
      cardBg: 'bg-amber-50/40 hover:bg-amber-50 border-amber-100/90',
      badgeBg: 'bg-amber-100/90 text-amber-700',
      module: 'memberships',
    },
    {
      id: 'renewals',
      count: renewalsCount,
      title: `Pending Renewals`,
      subtitle: `${renewalsCount} members requiring action`,
      icon: 'indian-rupee',
      iconBg: 'bg-emerald-500 text-white',
      cardBg: 'bg-emerald-50/40 hover:bg-emerald-50 border-emerald-100/90',
      badgeBg: 'bg-emerald-100/90 text-emerald-700',
      module: 'payments',
    },
    {
      id: 'leads',
      count: leadCount,
      title: `${leadCount} leads need follow-up`,
      subtitle: 'No activity recorded',
      icon: 'users',
      iconBg: 'bg-blue-500 text-white',
      cardBg: 'bg-blue-50/40 hover:bg-blue-50 border-blue-100/90',
      badgeBg: 'bg-blue-100/90 text-blue-700',
      module: 'crm',
    },
  ];

  return (
    <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
      {/* Header matching Screenshot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={18} className="text-purple-600" />
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            AI Needs Your Attention
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('crm')}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <Icon name="arrow-right" size={13} />
        </button>
      </div>

      {/* 4 Cards Grid matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onNavigate?.(item.module)}
            className={cn(
              'p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group shadow-2xs',
              item.cardBg
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', item.iconBg)}>
                <Icon name={item.icon} size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-900 transition-colors truncate">
                  {item.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-0.5 shadow-2xs', item.badgeBg)}>
                <span>{item.count}</span>
                <Icon name="chevron-right" size={12} className="opacity-70" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
