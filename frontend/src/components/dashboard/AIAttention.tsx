import { Icon } from '@/components/ui/Icon';
import type { AttentionMetrics } from '@/types/dashboard';

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
      cardBg: 'bg-rose-50/60 border-rose-100 hover:border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-700',
      module: 'customers',
    },
    {
      id: 'expiring',
      count: expiringCount,
      title: `${expiringCount} memberships expiring within 7 days`,
      subtitle: 'Reach out for renewal',
      icon: 'clock',
      iconBg: 'bg-amber-500 text-white',
      cardBg: 'bg-amber-50/60 border-amber-100 hover:border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-700',
      module: 'memberships',
    },
    {
      id: 'renewals',
      count: renewalsCount,
      title: `Pending Renewals`,
      subtitle: `${renewalsCount} members requiring action`,
      icon: 'indian-rupee',
      iconBg: 'bg-emerald-500 text-white',
      cardBg: 'bg-emerald-50/60 border-emerald-100 hover:border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-700',
      module: 'payments',
    },
    {
      id: 'leads',
      count: leadCount,
      title: `${leadCount} leads need follow-up`,
      subtitle: 'No activity recorded',
      icon: 'users',
      iconBg: 'bg-blue-500 text-white',
      cardBg: 'bg-blue-50/60 border-blue-100 hover:border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-700',
      module: 'crm',
    },
  ];

  return (
    <div className="card p-5 bg-white border border-purple-100/80 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="sparkles" size={18} className="text-purple-600 animate-pulse" />
          <h2 className="text-sm font-extrabold text-navy-900 tracking-wider uppercase">
            AI NEEDS YOUR ATTENTION
          </h2>
        </div>
        <button
          onClick={() => onNavigate?.('crm')}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onNavigate?.(item.module)}
            className={`p-4 rounded-xl border ${item.cardBg} flex items-center justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 group`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                <Icon name={item.icon} size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy-900 group-hover:text-purple-900 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[11px] font-medium text-navy-500 mt-0.5">{item.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={`w-5 h-5 rounded-full ${item.badgeBg} text-[11px] font-extrabold flex items-center justify-center`}>
                {item.count}
              </span>
              <Icon name="chevron-right" size={16} className="text-navy-400 group-hover:text-navy-700 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
