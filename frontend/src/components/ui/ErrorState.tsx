import { Icon } from './Icon';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Unable to Load Data',
  message = 'The gym server could not be reached. Please check your connection and try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="card p-8 text-center space-y-4 max-w-md mx-auto my-8 border border-danger-200 bg-danger-50/50 rounded-2xl animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-danger-100 flex items-center justify-center mx-auto text-danger-600">
        <Icon name="alert-triangle" size={28} />
      </div>
      <div>
        <h3 className="text-lg font-bold text-navy-900">{title}</h3>
        <p className="text-sm text-navy-600 mt-1">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary bg-danger-600 hover:bg-danger-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto"
        >
          <Icon name="refresh-cw" size={16} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
