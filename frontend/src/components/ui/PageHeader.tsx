import { cn } from '@/utils/cn';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, breadcrumb, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-navy-400 mb-1">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-navy-300">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-navy-600' : ''}>{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-navy-400 mt-1">{subtitle}</p>}
      </div>
      {(actions || children) && (
        <div className="flex items-center gap-2 flex-wrap">
          {actions || children}
        </div>
      )}
    </div>
  );
}
