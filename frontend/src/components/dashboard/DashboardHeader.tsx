import { getISTGreeting } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';
import { Icon } from '@/components/ui/Icon';

interface DashboardHeaderProps {
  userName?: string;
  vahdName?: string;
  branchName?: string;
  onAddstudent?: () => void;
  onAddPayment?: () => void;
  onAddSalesInvoice?: () => void;
}

export function DashboardHeader({
  userName,
  vahdName,
  branchName,
}: DashboardHeaderProps) {
  const { user } = useAuth();
  const greeting = getISTGreeting();

  // If resolvedName has all caps like "MAIN GYM OWNER", convert to title case, or use as is
  let rawName = (userName || user?.name || user?.full_name || 'Main Gym Owner').trim();
  const resolvedName = rawName
    ? rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : 'Main Gym Owner';

  return (
    <div className="space-y-1">
      {/* Breadcrumb matching design reference */}
      <div className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5">
        <Icon name="home" size={13} className="text-blue-600" />
        <span className="text-blue-600 hover:underline cursor-pointer">Home</span>
        <span className="text-slate-400">›</span>
        <span className="text-slate-900 font-black">Dashboard</span>
      </div>

      {/* Greeting Title with Theme Squircle Icon & Subtitle */}
      <div className="flex items-center gap-3.5 pt-0.5">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
          <Icon name="dumbbell" size={22} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
            {greeting}, {resolvedName} 👋
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
            Here's today's overview of your students, attendance and key updates.
          </p>
        </div>
      </div>
    </div>
  );
}
