import { cn } from '@/utils/cn';

export interface KpiCardProps {
  id?: string;
  label: string;
  value: string | number;
  change?: number | string;
  changeLabel?: string;
  sparkline?: number[];
  status?: 'up' | 'down' | 'neutral';
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'ai';
  hideSparkline?: boolean;
  hideChange?: boolean;
  className?: string;
}

const accentMap = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-600', spark: '#2563eb' },
  success: { bg: 'bg-success-50', text: 'text-success-600', spark: '#059669' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-600', spark: '#d97706' },
  danger: { bg: 'bg-danger-50', text: 'text-danger-600', spark: '#dc2626' },
  ai: { bg: 'bg-ai-50', text: 'text-ai-600', spark: '#9333ea' },
};

import { Icon } from './Icon';
import { Sparkline } from './Sparkline';

export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  sparkline,
  status,
  trend,
  icon,
  accent = 'brand',
  hideSparkline = false,
  hideChange = false,
  className,
}: KpiCardProps) {
  const currentStatus = status || trend || 'neutral';
  const a = accentMap[accent] || accentMap.brand;
  const isUp = currentStatus === 'up';
  const isDown = currentStatus === 'down';
  const changeColor = isUp ? 'text-success-600' : isDown ? 'text-danger-600' : 'text-navy-500';
  const changeBg = isUp ? 'bg-success-50' : isDown ? 'bg-danger-50' : 'bg-navy-100';

  const formatChange = (val: number | string) => {
    if (typeof val === 'number') {
      return `${isUp ? '+' : ''}${val}%`;
    }
    return val;
  };

  const isCompact = hideSparkline && hideChange;

  return (
    <div
      className={cn(
        'card card-hover transition-all duration-200 group flex flex-col justify-between',
        isCompact ? 'p-3.5 sm:p-4 min-h-[96px]' : 'p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <span className="stat-label text-[11px] font-bold text-slate-500 uppercase tracking-wider line-clamp-2 leading-tight">
          {label}
        </span>
        <div className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs', a.bg)}>
          <Icon name={icon} size={15} className={a.text} />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight leading-none mt-1">
        {value}
      </div>
      {!hideChange && (change !== undefined || changeLabel) && (
        <div className="flex items-center gap-2 mt-2">
          {change !== undefined && (
            <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-bold', changeBg, changeColor)}>
              {isUp && <Icon name="arrow-up-right" size={12} />}
              {isDown && <Icon name="arrow-down-right" size={12} />}
              {formatChange(change)}
            </span>
          )}
          {changeLabel && <span className="text-xs text-navy-400 font-medium">{changeLabel}</span>}
        </div>
      )}
      {!hideSparkline && sparkline && sparkline.length > 0 && (
        <div className="h-8 -mx-1 mt-2">
          <Sparkline data={sparkline} color={a.spark} height={32} />
        </div>
      )}
    </div>
  );
}
