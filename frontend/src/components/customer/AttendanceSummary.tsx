import { Icon } from '@/components/ui/Icon';
import type { CustomerAttendanceData } from '@/types/customer';

export function AttendanceSummary({ attendance }: { attendance?: CustomerAttendanceData | null }) {
  if (!attendance) return null;

  const monthlyTarget = 20;
  const visits = attendance.monthly_visits ?? 0;
  const progressPct = Math.min(100, Math.round((visits / monthlyTarget) * 100));

  return (
    <div className="card p-5 space-y-4 border border-navy-200">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center">
          <Icon name="calendar" size={18} className="text-success-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-navy-900">Attendance</h3>
          <p className="text-xs text-navy-400">Gym visits & consistency</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 rounded-xl bg-navy-50">
          <div className="text-xs text-navy-500 font-medium">Total Visits</div>
          <div className="text-2xl font-bold text-navy-900 mt-1">{attendance.total_visits ?? 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-navy-50">
          <div className="text-xs text-navy-500 font-medium">Current Streak</div>
          <div className="text-2xl font-bold text-success-600 mt-1">{attendance.current_streak ?? 0} Days</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs font-semibold text-navy-700 mb-1.5">
          <span>This Month ({visits} visits)</span>
          <span className="text-navy-400">{progressPct}% of goal</span>
        </div>
        <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-success-500 to-success-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {attendance.last_visit && (
        <div className="text-xs text-navy-500 flex items-center gap-1.5 pt-1">
          <Icon name="clock" size={12} className="text-navy-400" />
          Last Check-in: <span className="font-semibold text-navy-700">{attendance.last_visit}</span>
        </div>
      )}
    </div>
  );
}
