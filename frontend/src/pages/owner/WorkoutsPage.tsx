import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { Exercise, WorkoutPlan } from '@/types';
import { cn } from '@/utils/cn';

const splits = ['Push / Pull / Legs', 'Upper / Lower', 'Full Body', 'Single Muscle', 'Muscle Combination', 'Bro Split', 'Custom'];
const focuses = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Abs', 'Full Body'];
const muscleFilters = ['All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];
const difficultyColors: Record<string, 'success' | 'warning' | 'danger'> = {
  beginner: 'success', intermediate: 'warning', advanced: 'danger',
};

export function WorkoutsPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [split, setSplit] = useState('Push / Pull / Legs');
  const [focus, setFocus] = useState('Chest');
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.workouts.aiRecommendation().catch(() => null),
      api.workouts.exercises().catch(() => []),
    ])
      .then(([p, e]) => {
        if (!isMounted) return;
        setPlan(p || null);
        setExercises(Array.isArray(e) ? e : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setPlan(null);
        setExercises([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredExercises = exercises.filter((ex) => {
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === 'All' || ex.primaryMuscle === muscleFilter;
    return matchSearch && matchMuscle;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <PageHeader title="Workouts" breadcrumb={['Owner', 'Workouts']} actions={<button className="btn-primary"><Icon name="plus" size={16} /> Create Workout</button>} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input type="text" placeholder="Search exercises..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
        </div>
        <select value={split} onChange={(e) => setSplit(e.target.value)} className="input-field sm:w-auto"><option>Training Split</option>{splits.map((s) => <option key={s}>{s}</option>)}</select>
        <select value={focus} onChange={(e) => setFocus(e.target.value)} className="input-field sm:w-auto"><option>Workout Focus</option>{focuses.map((f) => <option key={f}>{f}</option>)}</select>
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : (
        <div className="card p-6 bg-gradient-to-br from-ai-50/60 via-white to-brand-50/40 border-ai-200/40 shadow-ai-glow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ai-500 to-ai-700 flex items-center justify-center">
                <Icon name="sparkles" size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-ai-600 uppercase tracking-wider">AI Today</div>
                <div className="text-lg font-bold text-navy-900">{plan?.title || 'Daily AI Training Split'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-navy-900">{plan?.duration || 45} min · {plan?.exerciseCount || 4} exercises</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-xs font-semibold text-navy-500 mb-1.5">AI Reasoning</div>
            <p className="text-sm text-navy-600 leading-relaxed">{plan?.aiReasoning || 'Personalized progressive overload schedule based on target muscle recovery score.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Training split', 'Previous performance', 'Recovery', 'Weekly muscle volume', 'Workout history'].map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-ai-50 text-xs font-semibold text-ai-700">{tag}</span>
            ))}
          </div>
          <button className="btn-primary w-full sm:w-auto"><Icon name="play" size={16} /> Start Workout</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {muscleFilters.map((m) => (
          <button key={m} onClick={() => setMuscleFilter(m)} className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all', muscleFilter === m ? 'bg-brand-600 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100')}>{m}</button>
        ))}
      </div>

      <div>
        <h3 className="text-base font-bold text-navy-900 mb-4">Exercise Library</h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExercises.map((ex) => (
              <div key={ex.id} className="card card-hover p-4 group">
                <div className="aspect-video rounded-2xl bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center mb-3 relative overflow-hidden">
                  <Icon name="dumbbell" size={32} className="text-navy-400" />
                  <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <Icon name="play" size={20} className="text-brand-600" />
                    </div>
                  </div>
                </div>
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-bold text-navy-900">{ex.name}</h4>
                  <Badge variant={difficultyColors[ex.difficulty] || 'brand'}>{ex.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-navy-500 mb-3">
                  <span className="flex items-center gap-1"><Icon name="target" size={12} /> {ex.primaryMuscle}</span>
                  <span className="flex items-center gap-1"><Icon name="dumbbell" size={12} /> {ex.equipment}</span>
                </div>
                <p className="text-xs text-navy-500 leading-relaxed line-clamp-2">{ex.instructions}</p>
                {ex.sets && (
                  <div className="flex gap-4 mt-3 pt-3 border-t border-navy-100 text-xs">
                    <span className="font-semibold text-navy-700">{ex.sets} sets</span>
                    <span className="font-semibold text-navy-700">{ex.reps} reps</span>
                    {ex.weight && <span className="font-semibold text-navy-700">{ex.weight}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
