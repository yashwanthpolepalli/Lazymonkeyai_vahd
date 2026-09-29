import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { KpiCard } from '@/components/ui/KpiCard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { customerApi } from '@/services/customerApi';
import type {
  CustomerDashboardData,
  CustomerTodayWorkout,
  CustomerNutritionData,
  AICoachRecommendation,
} from '@/types/customer';
import { CustomerGoogleReviewCard } from '@/components/customer/CustomerGoogleReviewCard';
import { cn } from '@/utils/cn';


export function CustomerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<CustomerDashboardData | null>(null);
  const [workout, setWorkout] = useState<CustomerTodayWorkout | null>(null);
  const [nutrition, setNutrition] = useState<CustomerNutritionData | null>(null);
  const [aiCoach, setAiCoach] = useState<AICoachRecommendation | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      customerApi.getDashboard(),
      customerApi.getTodaysWorkout(),
      customerApi.getTodaysNutrition(),
      customerApi.getAICoachRecommendation(),
    ])
      .then(([d, w, n, a]) => {
        setDashboard(d);
        setWorkout(w);
        setNutrition(n);
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
    { label: 'Attendance', icon: 'calendar-check', color: 'from-purple-600 to-indigo-700', path: '/app/attendance' },
    { label: 'Start Workout', icon: 'dumbbell', color: 'from-brand-500 to-brand-700', path: '/app/workouts' },
    { label: 'Scan Food', icon: 'scan-line', color: 'from-ai-500 to-ai-700', path: '/app/food-scanner' },
    { label: 'View Progress', icon: 'trending-up', color: 'from-warning-500 to-warning-700', path: '/app/progress' },
  ];

  const userName = user?.name ? user.name.split(' ')[0] : 'Member';

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Good morning, ${userName}`} breadcrumb={['Customer', 'Home']} />
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
        <PageHeader title={`Good morning, ${userName}`} breadcrumb={['Customer', 'Home']} />
        <ErrorState message={error} onRetry={fetchDashboard} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboard?.greeting || `Good morning, ${userName} 👋`}
        subtitle={dashboard?.subtitle || "Here's your fitness progress today"}
        breadcrumb={['Customer', 'Home']}
      />

      <div className="card p-6 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white relative overflow-hidden">

        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.4) 0%, transparent 50%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2"><span className="text-2xl">👋</span><h2 className="text-xl font-bold">Welcome back, {userName}!</h2></div>
            <p className="text-brand-100 text-sm max-w-md mb-4">{dashboard?.readiness?.message || 'Your daily workout and biometric readiness is optimized from live DB logs.'}</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Icon name="activity" size={16} className="text-brand-200" />
                <span className="text-sm font-semibold">Readiness: {dashboard?.readiness?.score ?? 85}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="dumbbell" size={16} className="text-brand-200" />
                <span className="text-sm font-semibold">
                  {workout?.title ? `${workout.title} · ${workout.duration_min || 45} min` : 'Custom Workout'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="flame" size={16} className="text-brand-200" />
                <span className="text-sm font-semibold">
                  {nutrition?.calories.current ?? 0} {nutrition?.calories.target ? `/ ${nutrition.calories.target}` : ''} kcal
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center shrink-0">
            <ProgressRing
              value={dashboard?.readiness?.score ?? 85}
              max={100}
              size={96}
              strokeWidth={8}
              color="#ffffff"
              trackColor="rgba(255,255,255,0.25)"
              label={`${dashboard?.readiness?.score ?? 85}%`}
              textColor="text-white"
              labelClassName="text-xl font-black text-white tracking-tight"
            />
            <span className="mt-2 text-[11px] font-bold text-white bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full uppercase tracking-wider text-center shadow-xs">
              {dashboard?.readiness?.label || 'Optimal Performance'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)} className="card card-hover p-5 text-left group">
            <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 transition-transform group-hover:scale-110', a.color)}>
              <Icon name={a.icon} size={22} className="text-white" />
            </div>
            <div className="text-sm font-bold text-navy-900">{a.label}</div>
            <div className="flex items-center gap-1 text-xs text-navy-400 mt-1">Tap to start <Icon name="chevron-right" size={12} /></div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Workout Card */}
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Today's Workout</h3>
          {workout && (workout.title || (Array.isArray(workout.exercises) && workout.exercises.length > 0)) ? (
            <div>
              <div className="flex items-center gap-2 mb-3"><Icon name="sparkles" size={16} className="text-ai-600" /><Badge variant="ai">AI Recommended</Badge></div>
              <div className="text-lg font-bold text-navy-900 mb-1">{workout.title || "Today's Workout"}</div>
              <div className="text-sm text-navy-400 mb-4">{workout.duration_min || 45} min · {workout.exercise_count || (workout.exercises?.length || 0)} exercises</div>
              {Array.isArray(workout.exercises) && workout.exercises.length > 0 ? (
                <div className="space-y-1 mb-4">
                  {workout.exercises.slice(0, 4).map((ex: any, i: number) => (
                    <div key={ex.id || i} className="flex items-center justify-between text-sm text-navy-700 py-1 border-b border-navy-50">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-navy-50 flex items-center justify-center text-xs font-bold text-navy-500">{i + 1}</span>
                        <span className="font-medium">{ex.name || 'Exercise'}</span>
                      </div>
                      <span className="text-xs text-navy-400 font-mono">{ex.sets || 3} × {ex.reps || 10} ({ex.weight_kg || 0} kg)</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-slate-500 mb-4">Exercises assigned for active training session.</p>
              )}
              <button onClick={() => navigate('/app/workouts')} className="btn-primary w-full flex items-center justify-center gap-2"><Icon name="play" size={16} /> Start Workout</button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Icon name="dumbbell" size={24} className="text-navy-300 mx-auto mb-2" />
              <p className="text-sm text-navy-500">No workout scheduled for today</p>
            </div>
          )}
        </div>

        {/* Today's Nutrition Card */}
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Today's Nutrition</h3>
          {nutrition ? (
            <div className="space-y-4">
              {[
                { label: 'Calories', current: nutrition.calories.current, target: nutrition.calories.target, unit: 'kcal', color: '#2563eb' },
                { label: 'Protein', current: nutrition.protein.current, target: nutrition.protein.target, unit: 'g', color: '#059669' },
                { label: 'Carbs', current: nutrition.carbs.current, target: nutrition.carbs.target, unit: 'g', color: '#d97706' },
                { label: 'Fat', current: nutrition.fat.current, target: nutrition.fat.target, unit: 'g', color: '#dc2626' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-semibold text-navy-700">{m.label}</span><span className="text-xs text-navy-400">{m.current} / {m.target} {m.unit}</span></div>
                  <div className="h-2 rounded-full bg-navy-100 overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%`, background: m.color }} /></div>
                </div>
              ))}
              <button onClick={() => navigate('/app/food-scanner')} className="btn-secondary w-full text-xs flex items-center justify-center gap-2 mt-2"><Icon name="scan-line" size={14} /> Scan Meal</button>
            </div>
          ) : (
            <div className="text-center py-6">
              <Icon name="apple" size={24} className="text-navy-300 mx-auto mb-2" />
              <p className="text-sm text-navy-500">No nutrition targets logged today</p>
            </div>
          )}
        </div>

        {/* AI Coach Insights Card */}
        <div className="card p-5 bg-gradient-to-br from-ai-50/50 to-white border border-ai-200/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3"><Icon name="sparkles" size={18} className="text-ai-600" /><h3 className="text-base font-bold text-navy-900">AI Coach Insight</h3></div>
            <h4 className="text-sm font-bold text-navy-800 mb-2">{aiCoach?.title || 'Personalized Recommendation'}</h4>
            <p className="text-xs text-navy-600 leading-relaxed italic">"{aiCoach?.insight}"</p>
          </div>
          <button onClick={() => navigate('/app/ai-coach')} className="btn-secondary mt-4 text-xs flex items-center justify-center gap-2"><Icon name="message-square" size={14} /> Chat with AI Coach</button>
        </div>
      </div>

      {/* Official Google Business Reviews & AI Suggestion Hub */}
      <CustomerGoogleReviewCard />
    </div>
  );
}


