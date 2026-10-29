import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import type { CustomerMembership } from '@/types/customer';

export function MembershipCard({ membership }: { membership?: CustomerMembership | null }) {
  const status = (membership?.status || 'Inactive').toLowerCase();
  const isActive = status === 'active';
  const planName = membership?.plan_name || 'No Active Plan';
  const daysRemaining = membership?.days_remaining ?? 0;

  return (
    <div className="card p-5 space-y-4 border border-navy-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <Icon name="credit-card" size={18} className="text-brand-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-navy-900">Membership</h3>
            <p className="text-xs text-navy-400">Plan validity & status</p>
          </div>
        </div>
        <Badge variant={isActive ? 'success' : 'warning'} dot>
          {membership?.status || 'Inactive'}
        </Badge>
      </div>

      <div className="p-4 rounded-2xl bg-navy-50 border border-navy-100 space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-navy-500 font-medium">Plan</span>
          <span className="font-bold text-navy-900">{planName}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-navy-500 font-medium">Start Date</span>
          <span className="font-semibold text-navy-700">{membership?.start_date || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-navy-500 font-medium">Expiry Date</span>
          <span className="font-semibold text-navy-700">{membership?.expiry_date || '—'}</span>
        </div>
        <div className="flex justify-between items-center text-sm pt-2 border-t border-navy-200">
          <span className="text-navy-500 font-medium">Days Remaining</span>
          <span className={`font-extrabold text-base ${isActive ? 'text-brand-600' : 'text-amber-600'}`}>
            {daysRemaining} Days
          </span>
        </div>
      </div>
    </div>
  );
}
