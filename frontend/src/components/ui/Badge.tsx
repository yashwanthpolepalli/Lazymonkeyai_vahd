import { cn } from '@/utils/cn';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'brand' | 'ai' | 'neutral' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variants: Record<string, string> = {
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  brand: 'bg-brand-50 text-brand-700',
  ai: 'bg-ai-50 text-ai-700',
  neutral: 'bg-navy-100 text-navy-600',
  purple: 'bg-purple-50 text-purple-700',
  gray: 'bg-slate-100 text-slate-700',
};

const dotColors: Record<string, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  brand: 'bg-brand-500',
  ai: 'bg-ai-500',
  neutral: 'bg-navy-400',
  purple: 'bg-purple-500',
  gray: 'bg-slate-400',
};

const sizes: Record<string, string> = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1.5',
};

export function Badge({ variant = 'neutral', size, children, className, dot }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant] || variants.neutral, size && sizes[size], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant] || dotColors.neutral)} />}
      {children}
    </span>
  );
}
