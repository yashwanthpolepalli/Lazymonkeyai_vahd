import { cn } from '@/utils/cn';

export interface KpiCardProps {
  id?: string;
  label: string;
  value: string;
  change?: number | string;
  changeLabel?: string;
  sparkline?: number[];
  status?: 'up' | 'down' | 'neutral';
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
  accent?: 'brand' | 'success' | 'warning' | 'danger' | 'ai';
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

export function KpiCard({ label, value, change, changeLabel, sparkline, status, trend, icon, accent = 'brand' }: KpiCardProps) {
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

  return (
    <div className="card card-hover p-5 group">
      <div className="flex items-start justify-between mb-3">
        <span className="stat-label">{label}</span>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', a.bg)}>
          <Icon name={icon} size={18} className={a.text} />
        </div>
      </div>
      <div className="text-2xl font-bold text-navy-900 mb-2 tracking-tight">{value}</div>
      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-2 mb-3">
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
      {sparkline && sparkline.length > 0 && (
        <div className="h-8 -mx-1">
          <Sparkline data={sparkline} color={a.spark} height={32} />
        </div>
      )}
    </div>
  );
}
