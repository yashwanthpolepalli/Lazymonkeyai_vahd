import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { AIAttention } from '@/components/dashboard/AIAttention';
import { LiveGymActivity } from '@/components/dashboard/LiveGymActivity';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export function OwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState
          title="Unable to Load Dashboard"
          message={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  const userName = data?.userName || user?.name || user?.full_name || '';
  const gymName = data?.gym?.name || user?.gym_name || '';
  const branchName = data?.gym?.branch || user?.branch_name || '';

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Level 1: Greeting Header */}
      <DashboardHeader
        userName={userName}
        gymName={gymName}
        branchName={branchName}
      />

      {/* Level 1 & 2: Key Business Performance Cards with Student/Employee Switch */}
      <DashboardKPIs summary={data?.summary || { total_members: 0, checkins_today: 0, active_memberships: 0, expiring_soon: 0, today_revenue: 0 }} />

      {/* Level 2: AI Needs Attention Banner */}
      <AIAttention
        attention={data?.attention || { churn_risk: 0, expiring_memberships: 0, pending_renewals: 0, lead_followups: 0 }}
        onNavigate={(module) => navigate(`/owner/${module}`)}
      />

      {/* Level 2: Live Activity (Unified Students & Employees Login / Logout stream) */}
      <div>
        <LiveGymActivity activity={data?.live_activity || []} />
      </div>
    </div>
  );
}
