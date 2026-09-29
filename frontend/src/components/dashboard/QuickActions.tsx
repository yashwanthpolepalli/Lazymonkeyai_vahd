import { Icon } from '@/components/ui/Icon';
import type { QuickActionItem } from '@/types/dashboard';

interface QuickActionsProps {
  actions?: QuickActionItem[];
  onActionClick?: (actionId: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
  const actions = [
    {
      id: 'add_member',
      title: 'Add Member',
      subtitle: 'Enroll new member',
      icon: 'user-plus',
      cardBg: 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'attendance',
      title: 'Mark Attendance',
      subtitle: 'Quick check-in',
      icon: 'check-square-2',
      cardBg: 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'invoice',
      title: 'Create Invoice',
      subtitle: 'Generate invoice',
      icon: 'file-text',
      cardBg: 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'pt_session',
      title: 'Add PT Session',
      subtitle: 'Book PT session',
      icon: 'dumbbell',
      cardBg: 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      id: 'workout',
      title: 'Create Workout',
      subtitle: 'Assign program',
      icon: 'sliders',
      cardBg: 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-100',
      iconColor: 'text-rose-600',
    },
    {
      id: 'biometric',
      title: 'Scan Body',
      subtitle: 'Body analysis',
      icon: 'scan',
      cardBg: 'bg-cyan-50/70 hover:bg-cyan-100/70 border-cyan-100',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'payment',
      title: 'Record Payment',
      subtitle: 'Receive payment',
      icon: 'indian-rupee',
      cardBg: 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'notification',
      title: 'Send Notification',
      subtitle: 'Broadcast message',
      icon: 'send',
      cardBg: 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'ai_insights',
      title: 'AI Insights',
      subtitle: 'Smart analytics',
      icon: 'sparkles',
      cardBg: 'bg-purple-50/70 hover:bg-purple-100/70 border-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-navy-900 tracking-wider uppercase">QUICK ACTIONS</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => onActionClick?.(act.id)}
              className={`p-3 rounded-xl border ${act.cardBg} text-left flex items-start gap-3 transition-all duration-200 hover:-translate-y-0.5 group`}
            >
              <div className={`p-1.5 rounded-lg bg-white ${act.iconColor} shadow-2xs shrink-0 mt-0.5`}>
                <Icon name={act.icon} size={16} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-navy-900 group-hover:text-brand-600 transition-colors">
                  {act.title}
                </h4>
                <p className="text-[10px] font-medium text-navy-500">{act.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-navy-100 text-center">
        <button
          onClick={() => onActionClick?.('dashboard')}
          className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1"
        >
          View All Actions <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  );
}
