export interface KpiSummary {
  total_members: number;
  checkins_today: number;
  active_memberships: number;
  expiring_soon: number;
  today_revenue: number;
}

export interface AttentionMetrics {
  churn_risk: number;
  expiring_memberships: number;
  pending_renewals: number;
  lead_followups: number;
}

export interface MembershipHealthBreakdown {
  active: number;
  expiring: number;
  expired: number;
  inactive: number;
}

export interface RevenueBreakdownData {
  memberships: number;
  pt: number;
  pos: number;
  other: number;
}

export interface LiveActivityItem {
  id: string;
  type: 'checkin' | 'membership' | 'payment' | 'body_scan' | 'workout' | 'lead';
  title: string;
  description: string;
  time: string;
  member?: string;
}

export interface TopTrainerItem {
  id: string;
  name: string;
  avatar: string;
  clients: number;
  revenue: number;
  rating: number;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink';
  action: string;
}

export interface DashboardData {
  gym: {
    name: string;
    branch: string;
  };
  summary: KpiSummary;
  attention: AttentionMetrics;
  membership_health: MembershipHealthBreakdown;
  revenue: RevenueBreakdownData;
  live_activity: LiveActivityItem[];
  top_trainers: TopTrainerItem[];
  quick_actions: QuickActionItem[];
}
