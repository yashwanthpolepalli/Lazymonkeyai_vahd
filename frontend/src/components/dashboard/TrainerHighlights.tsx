import { Icon } from '@/components/ui/Icon';
import type { TopTrainerItem } from '@/types/dashboard';

interface TrainerHighlightsProps {
  trainers: TopTrainerItem[];
  onViewAll?: () => void;
}

export function TrainerHighlights({ trainers, onViewAll }: TrainerHighlightsProps) {
  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const items = trainers || [];

  const rankBadges = [
    { bg: 'bg-amber-100 text-amber-700 border-amber-300', text: '1' },
    { bg: 'bg-slate-200 text-slate-700 border-slate-300', text: '2' },
    { bg: 'bg-amber-700/10 text-amber-900 border-amber-600/30', text: '3' },
    { bg: 'bg-navy-100 text-navy-600 border-navy-200', text: '4' },
  ];

  return (
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-extrabold text-navy-900 tracking-wider uppercase">TOP PERFORMING TRAINERS</h3>
          <select className="input-field !py-1 !px-2.5 text-xs font-semibold sm:w-auto bg-navy-50 border-navy-200">
            <option>This Month</option>
            <option>Today</option>
            <option>This Week</option>
          </select>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-navy-400">
            No trainer metrics recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((t, idx) => {
              const rank = rankBadges[idx] || { bg: 'bg-navy-100 text-navy-600 border-navy-200', text: String(idx + 1) };
              const initials = (t.name || 'T')
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'T';

              return (
                <div key={t.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-navy-50/60 transition-colors group">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full ${rank.bg} border text-[11px] font-extrabold flex items-center justify-center shrink-0`}>
                      {rank.text}
                    </span>

                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-navy-100 shadow-xs uppercase">
                      {initials}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors">{t.name}</h4>
                      <p className="text-[11px] font-medium text-navy-500">{t.clients} Clients</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-navy-900">{formatINR(t.revenue)}</div>
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-amber-500 mt-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < Math.floor(t.rating) ? 'text-amber-400' : 'text-navy-200'}>★</span>
                      ))}
                      <span className="text-navy-700 ml-0.5">{t.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-navy-100 text-center">
        <button onClick={onViewAll} className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1">
          View All Trainers <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  );
}
