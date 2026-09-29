import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-navy-100 flex items-center justify-center mb-4">
          <span className="text-2xl">{icon}</span>
        </div>
      )}
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && <p className="text-sm text-navy-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-danger-50 flex items-center justify-center mb-4">
        <span className="text-2xl text-danger-500">!</span>
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      <p className="text-sm text-navy-500 mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-4">Try again</button>
      )}
    </div>
  );
}
