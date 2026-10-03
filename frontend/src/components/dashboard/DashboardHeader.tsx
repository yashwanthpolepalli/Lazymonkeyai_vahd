import { getISTGreeting } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';

interface DashboardHeaderProps {
  userName?: string;
  gymName?: string;
  branchName?: string;
  onAddCustomer?: () => void;
  onAddPayment?: () => void;
  onAddSalesInvoice?: () => void;
}

export function DashboardHeader({
  userName,
  gymName,
  branchName,
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const greeting = getISTGreeting();

  const resolvedName = (userName || user?.name || user?.full_name || '').trim();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
          {greeting.toUpperCase()}{resolvedName ? `, ${resolvedName.toUpperCase()}` : ''} 👋
        </h1>
      </div>
    </div>
  );
}
