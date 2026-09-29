import { useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { LiveActivityItem } from '@/types/dashboard';

interface LiveGymActivityProps {
  activity: LiveActivityItem[];
}

export function LiveGymActivity({ activity }: LiveGymActivityProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const getIcon = (type: LiveActivityItem['type']) => {
    switch (type) {
      case 'checkin':
        return { name: 'scan-face', color: 'text-blue-600 bg-blue-50' };
      case 'membership':
        return { name: 'credit-card', color: 'text-purple-600 bg-purple-50' };
      case 'payment':
        return { name: 'indian-rupee', color: 'text-emerald-600 bg-emerald-50' };
      case 'body_scan':
        return { name: 'scale', color: 'text-teal-600 bg-teal-50' };
      case 'workout':
        return { name: 'dumbbell', color: 'text-amber-600 bg-amber-50' };
      default:
        return { name: 'activity', color: 'text-navy-600 bg-navy-50' };
    }
  };

  const handleScroll = (direction: 'up' | 'down') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'up' ? -150 : 150;
      scrollRef.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  const itemsToRender = activity || [];

  return (
    <div className="card p-5 bg-white border border-navy-100/80 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold text-navy-900 tracking-wider uppercase">LIVE GYM ACTIVITY</h3>
            <span className="text-[11px] text-navy-400 font-semibold">({itemsToRender.length})</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>

            {/* Vertical Scroll Buttons */}
            {itemsToRender.length > 5 && (
              <div className="flex items-center gap-0.5 bg-navy-50 border border-navy-100 rounded-lg p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleScroll('up')}
                  title="Scroll Up"
                  className="p-1 rounded-md text-navy-500 hover:text-navy-900 hover:bg-white transition-all cursor-pointer"
                  aria-label="Scroll Up"
                >
                  <Icon name="chevron-up" size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleScroll('down')}
                  title="Scroll Down"
                  className="p-1 rounded-md text-navy-500 hover:text-navy-900 hover:bg-white transition-all cursor-pointer"
                  aria-label="Scroll Down"
                >
                  <Icon name="chevron-down" size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {itemsToRender.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-navy-400">
            No check-in or activity events recorded today yet.
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="max-h-[392px] overflow-y-auto space-y-2 pr-1.5 scroll-smooth overscroll-contain"
          >
            {itemsToRender.map((item) => {
              const iconMeta = getIcon(item.type);
              const initials = (item.title || 'U')
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'U';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-navy-50/70 transition-colors group border border-transparent hover:border-navy-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center border border-navy-100 shadow-xs uppercase">
                        {initials}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${iconMeta.color} flex items-center justify-center text-[9px] shadow-2xs border border-white`}>
                        <Icon name={iconMeta.name} size={10} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-navy-900 group-hover:text-brand-600 transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-medium text-navy-500 truncate">{item.description}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-navy-400 shrink-0 ml-2">{item.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-navy-100 text-center">
        <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1 cursor-pointer">
          View All Activity <Icon name="arrow-right" size={14} />
        </button>
      </div>
    </div>
  );
}
