import { useNavigate } from 'react-router-dom';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { AIAttention } from '@/components/dashboard/AIAttention';
import { LiveGymActivity } from '@/components/dashboard/LiveGymActivity';
import { MembershipHealth } from '@/components/dashboard/MembershipHealth';
import { RevenueOverview } from '@/components/dashboard/RevenueOverview';
import { TrainerHighlights } from '@/components/dashboard/TrainerHighlights';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

export function OwnerDashboard() {
  const navigate = useNavigate();
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

  const gymName = data?.gym?.name || 'VAHD';
  const branchName = data?.gym?.branch || 'Indiranagar';

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Level 1: Greeting Header */}
      <DashboardHeader
        gymName={gymName}
        branchName={branchName}
      />

      {/* Level 1 & 2: Key Business Performance Cards */}
      <DashboardKPIs summary={data?.summary || { total_members: 0, checkins_today: 0, active_memberships: 0, expiring_soon: 0, today_revenue: 0 }} />


      {/* Level 2: AI Needs Attention Banner */}
      <AIAttention
        attention={data?.attention || { churn_risk: 0, expiring_memberships: 0, pending_renewals: 0, lead_followups: 0 }}
        onNavigate={(module) => navigate(`/owner/${module}`)}
      />

      {/* Level 2: Live Gym Activity & Membership Health Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveGymActivity activity={data?.live_activity || []} />
        <MembershipHealth
          health={data?.membership_health || { active: 0, expiring: 0, expired: 0, inactive: 0 }}
          onViewDetails={() => navigate('/owner/settings?tab=memberships')}
        />
      </div>

      {/* Level 2 & 3: Revenue Overview & Top Trainers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueOverview revenue={data?.revenue || { memberships: 0, pt: 0, pos: 0, other: 0 }} />
        <TrainerHighlights
          trainers={data?.top_trainers || []}
          onViewAll={() => navigate('/owner/hrms?tab=trainers')}
        />
      </div>

      {/* Level 3: Quick Action Launchpad */}
      <QuickActions
        actions={data?.quick_actions || []}
        onActionClick={(actionId) => {
          if (actionId === 'add_member') navigate('/owner/customers');
          else if (actionId === 'payment') navigate('/owner/payments');
          else if (actionId === 'attendance') navigate('/owner/hrms?tab=attendance');
          else if (actionId === 'biometric') navigate('/owner/iot?tab=biometrics');
          else if (actionId === 'invoice') navigate('/owner/pos');
          else navigate('/owner');
        }}
      />
    </div>
  );
}
