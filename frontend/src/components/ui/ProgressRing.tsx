import { cn } from '@/utils/cn';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  textColor?: string;
  labelClassName?: string;
  sublabelClassName?: string;
  className?: string;
}

export function ProgressRing({
  value, max, size = 120, strokeWidth = 10, color = '#2563eb',
  trackColor = '#e2e8f0', label, sublabel, textColor,
  labelClassName, sublabelClassName, className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / (max || 1), 0), 1);
  const offset = circumference * (1 - pct);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
        {label && (
          <span className={cn('text-lg font-extrabold', textColor || 'text-navy-900', labelClassName)}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className={cn('text-[11px] font-semibold leading-tight mt-0.5 truncate max-w-[85%]', textColor ? 'opacity-80' : 'text-navy-400', sublabelClassName)}>
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
