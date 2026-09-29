import { apiClient } from './apiClient';
import type { DashboardData } from '@/types/dashboard';

export const dashboardApi = {
  getOverview: async (branch?: string): Promise<DashboardData> => {
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const res = await apiClient.get<any>(`/dashboard/owner${query}`);

    const liveActivity = (res?.recentCheckIns || []).map((item: any) => ({
      id: item.eventId || `act-${Math.random()}`,
      type: item.method && item.method.toLowerCase().includes('face') ? 'checkin' : 'payment',
      title: item.customerName || 'Gym Member',
      description: `${item.zone || 'Entrance'} · ${item.method || 'Check-in'}`,
      time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
    }));

    const totalMembers = (res?.radarHealthy || 0) + (res?.radarAttention || 0) + (res?.radarHighRisk || 0);

    return {
      gym: {
        name: res?.gymName || 'Fit Club',
        branch: res?.branchName || branch || 'Main Branch',
      },
      summary: {
        total_members: totalMembers,
        checkins_today: res?.todayAttendance ?? 0,
        active_memberships: res?.radarHealthy ?? 0,
        expiring_soon: res?.expiringSoonCount ?? 0,
        today_revenue: res?.todayRevenue ?? 0,
      },
      attention: {
        churn_risk: res?.atRiskCount ?? 0,
        expiring_memberships: res?.expiringSoonCount ?? 0,
        pending_renewals: res?.dueMembersCount ?? 0,
        lead_followups: 0,
      },
      live_activity: liveActivity,
      membership_health: {
        active: res?.radarHealthy ?? 0,
        expiring: res?.expiringSoonCount ?? 0,
        expired: 0,
        inactive: res?.radarHighRisk ?? 0,
      },
      revenue: {
        memberships: res?.revenueBreakdown?.memberships ?? (res?.todayRevenue || 0),
        pt: res?.revenueBreakdown?.pt ?? 0,
        pos: res?.revenueBreakdown?.pos ?? 0,
        other: res?.revenueBreakdown?.other ?? 0,
      },
      top_trainers: [],
      quick_actions: [
        { id: 'add_member', title: 'Add Member', description: 'Enroll new member', icon: 'user-plus', accent: 'blue', action: 'add_member' },
        { id: 'attendance', title: 'Mark Attendance', description: 'Quick check-in', icon: 'check-square-2', accent: 'green', action: 'attendance' },
        { id: 'invoice', title: 'Create Invoice', description: 'Generate invoice', icon: 'file-text', accent: 'purple', action: 'invoice' },
        { id: 'pt_session', title: 'Add PT Session', description: 'Book PT session', icon: 'dumbbell', accent: 'orange', action: 'pt_session' },
        { id: 'workout', title: 'Create Workout', description: 'Assign program', icon: 'sliders', accent: 'pink', action: 'workout' },
        { id: 'biometric', title: 'Scan Body', description: 'Body analysis', icon: 'scan', accent: 'teal', action: 'biometric' },
        { id: 'payment', title: 'Record Payment', description: 'Receive payment', icon: 'indian-rupee', accent: 'green', action: 'payment' },
        { id: 'notification', title: 'Send Notification', description: 'Broadcast message', icon: 'send', accent: 'blue', action: 'notification' },
        { id: 'ai_insights', title: 'AI Insights', description: 'Smart analytics', icon: 'sparkles', accent: 'purple', action: 'ai_insights' },
      ],
    };
  },
  getReportsAnalytics: (): Promise<any> => apiClient.get('/dashboard/reports-analytics'),
};
