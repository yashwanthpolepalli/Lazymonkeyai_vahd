import { cn } from '@/utils/cn';

interface BarChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
  className?: string;
}

export function BarChart({ data, labels, height = 160, color = '#2563eb', highlightLast = true, className }: BarChartProps) {
  const max = Math.max(...data) * 1.1 || 1;
  const isDense = data.length >= 16;
  const step = isDense ? Math.ceil(data.length / 6) : 1;

  return (
    <div className={cn('w-full flex flex-col justify-end overflow-hidden', className)} style={{ height }}>
      <div className={cn('w-full flex items-end flex-1 min-h-0 pb-1.5', isDense ? 'gap-1' : 'gap-2')}>
        {data.map((v, i) => (
          <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group relative">
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-navy-900 text-white text-[10px] font-bold shadow-lg z-20 whitespace-nowrap pointer-events-none">
              {labels[i] || `${i}:00`}: {v}
            </div>
            <div
              className={cn('w-full rounded-t transition-all duration-300 group-hover:opacity-80')}
              style={{
                height: `${Math.max(4, (v / max) * 100)}%`,
                background: highlightLast && i === data.length - 1 ? color : `${color}66`,
                minHeight: 4,
              }}
            />
          </div>
        ))}
      </div>
      {isDense ? (
        <div className="w-full flex justify-between text-[10px] font-bold text-navy-400 border-t border-navy-100/70 pt-1.5 px-0.5">
          {labels.map((l, i) => {
            if (i === 0 || i === labels.length - 1 || i % step === 0) {
              return <span key={i}>{l}</span>;
            }
            return null;
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          {labels.map((l, i) => (
            <span key={i} className="flex-1 text-center text-[10px] font-medium text-navy-400 truncate">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface HourlyDistributionChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  color?: string;
  peakHour?: string;
  className?: string;
}

export function HourlyDistributionChart({
  data,
  labels,
  height = 180,
  color = '#8b5cf6',
  className,
}: HourlyDistributionChartProps) {
  const chartData = data && data.length === 24 ? data : (data || Array(24).fill(0));
  const defaultLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const chartLabels = labels && labels.length === 24 ? labels : defaultLabels;
  const maxVal = Math.max(...chartData, 1);
  const peakVal = Math.max(...chartData);

  return (
    <div className={cn('w-full flex flex-col justify-end overflow-hidden', className)} style={{ height }}>
      {/* 24 Dynamic Bars that auto-fit 100% container width */}
      <div className="w-full flex items-end justify-between gap-1 flex-1 min-h-0 pb-1.5">
        {chartData.map((val, idx) => {
          const pct = Math.max(4, Math.round((val / maxVal) * 100));
          const isPeak = val === peakVal && val > 0;
          return (
            <div key={idx} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center px-2 py-0.5 rounded bg-navy-900 text-white text-[10px] font-bold shadow-lg z-20 whitespace-nowrap pointer-events-none">
                {chartLabels[idx]}: {val} check-in{val === 1 ? '' : 's'}
              </div>
              <div
                className={cn(
                  'w-full rounded-t transition-all duration-300',
                  isPeak ? 'shadow-sm' : 'hover:opacity-90'
                )}
                style={{
                  height: `${pct}%`,
                  backgroundColor: isPeak ? color : `${color}55`,
                  minHeight: '4px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* 6 Responsive Clean Ticks */}
      <div className="w-full flex justify-between text-[10px] font-bold text-navy-400 border-t border-navy-100/70 pt-1.5 px-0.5">
        <span>12 AM</span>
        <span>4 AM</span>
        <span>8 AM</span>
        <span>12 PM</span>
        <span>4 PM</span>
        <span>8 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
}

interface LineChartProps {
  data: number[];
  labels: string[];
  height?: number;
  color?: string;
  className?: string;
  area?: boolean;
}

export function LineChart({ data, labels, height = 180, color = '#2563eb', className, area = true }: LineChartProps) {
  const max = Math.max(...data) * 1.1 || 1;
  const min = Math.min(...data) * 0.9;
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${w},${h} L 0,${h} Z`;
  const gid = `line-${color.replace('#', '')}`;

  return (
    <div className={cn('w-full', className)}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={areaD} fill={`url(#${gid})`} />}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * w;
          const y = h - ((v - min) / range) * (h - 20) - 10;
          return <circle key={i} cx={x} cy={y} r="1.5" fill={color} vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="flex justify-between mt-2">
        {labels.map((l, i) => (
          <span key={i} className="text-[10px] font-medium text-navy-400">{l}</span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  className?: string;
  centerLabel?: string;
  centerSublabel?: string;
}

export function DonutChart({ segments, size = 160, className, centerLabel, centerSublabel }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={seg.color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerLabel && <span className="text-xl font-bold text-navy-900">{centerLabel}</span>}
        {centerSublabel && <span className="text-xs text-navy-400 font-medium">{centerSublabel}</span>}
      </div>
    </div>
  );
}
