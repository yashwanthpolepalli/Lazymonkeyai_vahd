import { Icon } from './Icon';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = 'package',
}: EmptyStateProps) {
  return (
    <div className="card p-10 text-center space-y-4 max-w-lg mx-auto my-8 border border-navy-100 rounded-2xl bg-white animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto text-navy-400">
        <Icon name={icon} size={32} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-navy-900">{title}</h3>
        <p className="text-sm text-navy-500 max-w-xs mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-primary bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto"
        >
          <Icon name="plus" size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
