import { cn } from '@/utils/cn';

interface ProgressBarProps {
  value: number; // 0 to 100
  colorClass?: string;
  className?: string;
}

export function ProgressBar({ value, colorClass = 'bg-brand-600', className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div className={cn('w-full bg-navy-100 h-2 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full transition-all duration-500 rounded-full', colorClass)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
