import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { KpiCard } from '@/components/ui/KpiCard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/customerApi';
import type {
  CustomerDashboardData,
  CustomerAttendanceData,
  AICoachRecommendation,
} from '@/types/customer';
import { CustomerGoogleReviewCard } from '@/components/customer/CustomerGoogleReviewCard';
import { AttendanceSummary } from '@/components/customer/AttendanceSummary';
import { cn } from '@/utils/cn';
import { getISTGreeting } from '@/utils/date';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null);
  const [attendance, setAttendance] = useState<CustomerAttendanceData | null>(null);
  const [aiCoach, setAiCoach] = useState<AICoachRecommendation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      customerApi.getDashboard(),
      customerApi.getAttendance().catch(() => null),
      customerApi.getAICoachRecommendation().catch(() => null),
    ])
      .then(([d, att, a]) => {
        setDashboard(d);
        setAttendance(att);
        setAiCoach(a);
      })
      .catch(() => {
        setError('Unable to load dashboard metrics. Please check connection and try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const actions = [
    { label: 'Attendance & Check-in', icon: 'calendar-check', color: 'from-purple-600 to-indigo-700', path: '/app/attendance' },
    { label: 'AI Coach Hub', icon: 'sparkles', color: 'from-ai-500 to-ai-700', path: '/app/ai-coach' },
    { label: 'My Profile & Account', icon: 'user', color: 'from-blue-500 to-blue-700', path: '/app/profile' },
  ];

  const userName = user?.name ? user.name.split(' ')[0] : 'Member';

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={`${getISTGreeting()}, ${userName}`} breadcrumb={['Customer', 'Home']} />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={`${getISTGreeting()}, ${userName}`} breadcrumb={['Customer', 'Home']} />
        <ErrorState message={error} onRetry={fetchDashboard} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboard?.greeting || `${getISTGreeting()}, ${userName} 👋`}
        subtitle={dashboard?.subtitle || "Here is your attendance and member portal overview today."}
        breadcrumb={['Customer', 'Home']}
      />

      <div className="card p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.4) 0%, transparent 50%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="text-2xl">👋</span><h2 className="text-xl font-bold">Welcome back, {userName}!</h2></div>
            <p className="text-brand-100 text-sm max-w-md mb-4">Your membership and attendance metrics are live and synchronized.</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Icon name="activity" size={16} className="text-brand-200" />
                <span className="text-sm font-semibold">Status: Active Member</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="calendar-check" size={16} className="text-brand-200" />
                <span className="text-sm font-semibold">
                  {attendance?.monthly_visits ?? 0} Visits This Month
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center shrink-0">
            <ProgressRing
              value={85}
              max={100}
              size={96}
              strokeWidth={8}
              color="#ffffff"
              trackColor="rgba(255,255,255,0.25)"
              label="85%"
              textColor="text-white"
              labelClassName="text-xl font-black text-white tracking-tight"
            />
            <span className="mt-2 text-[11px] font-bold text-white bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full uppercase tracking-wider text-center shadow-xs">
              Prime Member
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)} className="card card-hover p-5 text-left group">
            <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 transition-transform group-hover:scale-110', a.color)}>
              <Icon name={a.icon} size={22} className="text-white" />
            </div>
            <div className="text-sm font-bold text-navy-900">{a.label}</div>
            <div className="flex items-center gap-1 text-xs text-navy-400 mt-1">Tap to open <Icon name="chevron-right" size={12} /></div>
          </button>
        ))}
      </div>

      {dashboard?.kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboard.kpis.map((k) => (
            <KpiCard key={k.id} {...k} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Summary Card */}
        {attendance ? (
          <AttendanceSummary attendance={attendance} />
        ) : (
          <div className="card p-5 space-y-4 border border-navy-200">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                <Icon name="calendar-check" size={18} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Attendance Hub</h3>
                <p className="text-xs text-navy-400">Punch records & geofence tracking</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">Record your daily check-in via face verification or geofenced punch.</p>
            <button onClick={() => navigate('/app/attendance')} className="btn-primary w-full text-xs flex items-center justify-center gap-2">
              <Icon name="calendar-check" size={14} /> Open Attendance Portal
            </button>
          </div>
        )}

        {/* AI Coach Insights Card */}
        <div className="card p-5 bg-gradient-to-br from-ai-50/50 to-white border border-ai-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3"><Icon name="sparkles" size={18} className="text-ai-600" /><h3 className="text-base font-bold text-navy-900">AI Coach Insight</h3></div>
            <h4 className="text-sm font-bold text-navy-800 mb-2">{aiCoach?.title || 'Personalized Recommendation'}</h4>
            <p className="text-xs text-navy-600 leading-relaxed italic">"{aiCoach?.insight || 'Stay consistent with your daily attendance routine for optimal results.'}"</p>
          </div>
          <button onClick={() => navigate('/app/ai-coach')} className="btn-secondary mt-4 text-xs flex items-center justify-center gap-2"><Icon name="message-square" size={14} /> Chat with AI Coach</button>
        </div>
      </div>

      {/* Official Google Business Reviews & AI Suggestion Hub */}
      <CustomerGoogleReviewCard />
    </div>
  );
}
