import { useNavigate } from 'react-router-dom';
import { UserPlus, Plus, Receipt, IndianRupee } from 'lucide-react';
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
  onAddCustomer,
  onAddPayment,
  onAddSalesInvoice,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const greeting = getISTGreeting();

  const resolvedName = (userName || user?.name || user?.full_name || '').trim();
  const resolvedGym = (gymName || user?.gymName || '').trim();
  const resolvedBranch = (branchName || user?.branchName || '').trim();
  const locationLabel = [resolvedGym, resolvedBranch].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight flex items-center gap-2">
          {greeting.toUpperCase()}{resolvedName ? `, ${resolvedName.toUpperCase()}` : ''} 👋
        </h1>
        <p className="text-xs sm:text-sm text-navy-500 font-medium mt-0.5">
          Here&apos;s what&apos;s happening{locationLabel ? <> at <span className="font-semibold text-navy-700">{locationLabel}</span></> : ''} today.
        </p>
      </div>

      {/* Quick Action Buttons in Header Empty Space */}
      <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
        {/* 1. Add Student Button */}
        <button
          type="button"
          onClick={() => {
            if (onAddCustomer) onAddCustomer();
            else navigate('/owner/customers?action=new');
          }}
          className="h-10 px-4 rounded-xl bg-white hover:bg-blue-50/60 text-blue-700 hover:text-blue-800 border border-blue-200/90 hover:border-blue-300 shadow-xs hover:shadow-sm text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus size={15} className="text-blue-600 stroke-[2.2]" />
          <span>Add Student</span>
        </button>

        {/* 2. Add Payment Button */}
        <button
          type="button"
          onClick={() => {
            if (onAddPayment) onAddPayment();
            else navigate('/owner/payments?action=new');
          }}
          className="h-10 px-4 rounded-xl bg-white hover:bg-emerald-50/60 text-emerald-700 hover:text-emerald-800 border border-emerald-200/90 hover:border-emerald-300 shadow-xs hover:shadow-sm text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <IndianRupee size={15} className="text-emerald-600 stroke-[2.2]" />
          <span>Add Payment</span>
        </button>

        {/* 3. Add Invoice Button */}
        <button
          type="button"
          onClick={() => {
            if (onAddSalesInvoice) onAddSalesInvoice();
            else navigate('/owner/pos?tab=sales');
          }}
          className="h-10 px-4.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg shadow-purple-500/25 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer border-0 tracking-wide"
        >
          <Plus size={15} className="stroke-[2.5]" />
          <Receipt size={15} />
          <span>Add Invoice</span>
        </button>
      </div>
    </div>
  );
}
