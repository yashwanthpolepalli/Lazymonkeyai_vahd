import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { Exercise, WorkoutPlan } from '@/types';
import { cn } from '@/utils/cn';

interface SetLog {
  set: number;
  reps: number;
  weight: number;
  rpe: number;
  done: boolean;
}

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sets, setSets] = useState<SetLog[]>([]);
  const [restTimer, setRestTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    api.workouts.aiRecommendation().then((p) => {
      setPlan(p);
      const initialSets: SetLog[] = Array.from({ length: p.exercises[0]?.sets || 4 }, (_, i) => ({
        set: i + 1, reps: 10, weight: 60, rpe: 7, done: false,
      }));
      setSets(initialSets);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setRestTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (!plan) return null;

  const current: Exercise = plan.exercises[currentIdx] || plan.exercises[0];
  const completedSets = sets.filter((s) => s.done).length;

  const completeSet = (idx: number) => {
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, done: true } : s)));
    setRestTimer(90);
    setTimerRunning(true);
  };

  const nextExercise = () => {
    if (currentIdx < plan.exercises.length - 1) {
      const ni = currentIdx + 1;
      setCurrentIdx(ni);
      const ex = plan.exercises[ni];
      setSets(Array.from({ length: ex?.sets || 4 }, (_, i) => ({ set: i + 1, reps: 10, weight: 60, rpe: 7, done: false })));
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active Workout"
        breadcrumb={['Workouts', 'Active']}
        actions={
          <>
            <button onClick={() => navigate(-1)} className="btn-secondary"><Icon name="x" size={16} /> Cancel</button>
            <button className="btn-primary bg-success-600 hover:bg-success-700"><Icon name="check" size={16} /> Finish Workout</button>
          </>
        }
      />

      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ai-50 flex items-center justify-center"><Icon name="sparkles" size={18} className="text-ai-600" /></div>
          <div>
            <div className="text-sm font-bold text-navy-900">{plan.title}</div>
            <div className="text-xs text-navy-400">Exercise {currentIdx + 1} of {plan.exercises.length} · {completedSets} sets done</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {plan.exercises.map((_, i) => (
              <div key={i} className={cn('w-2 h-2 rounded-full', i === currentIdx ? 'bg-brand-600' : i < currentIdx ? 'bg-success-400' : 'bg-navy-200')} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4">
          <div className="aspect-video rounded-2xl bg-gradient-to-br from-navy-100 to-navy-200 flex items-center justify-center mb-4 relative overflow-hidden">
            <Icon name="video" size={40} className="text-navy-400" />
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-navy-900/60 backdrop-blur text-white text-xs font-semibold">
              <Icon name="play" size={12} /> Demo Video
            </div>
          </div>
          <h3 className="text-sm font-bold text-navy-900 mb-2">{current.name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="brand">{current.primaryMuscle}</Badge>
            <Badge variant="neutral">{current.equipment}</Badge>
            <Badge variant={current.difficulty === 'beginner' ? 'success' : current.difficulty === 'intermediate' ? 'warning' : 'danger'}>{current.difficulty}</Badge>
          </div>
          <p className="text-xs text-navy-500 leading-relaxed">{current.instructions}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-navy-900">{current.name}</h3>
            <Badge variant="brand">Set {completedSets + 1}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-navy-50">
              <div className="stat-label mb-1">Previous</div>
              <div className="text-sm font-bold text-navy-900">{current.previousPerformance || '—'}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-navy-50">
              <div className="stat-label mb-1">Target Reps</div>
              <div className="text-sm font-bold text-navy-900">{current.reps || '—'}</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-navy-50">
              <div className="stat-label mb-1">RPE Target</div>
              <div className="text-sm font-bold text-navy-900">7-8</div>
            </div>
          </div>

          <div className="card p-4 bg-gradient-to-br from-ai-50/60 to-white border-ai-200/40 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="sparkles" size={16} className="text-ai-600" />
              <span className="text-xs font-bold text-ai-600 uppercase tracking-wider">AI Adaptation</span>
            </div>
            <p className="text-sm text-navy-700 leading-relaxed">
              Performance is above your previous session. Suggested next set: <span className="font-bold text-navy-900">62.5 kg × 8–10 reps</span>.
            </p>
          </div>

          {restTimer > 0 && (
            <div className="card p-4 bg-brand-50 border-brand-200 mb-4 text-center">
              <div className="stat-label mb-1">Rest Timer</div>
              <div className="text-2xl font-bold text-brand-700 tabular-nums">{fmtTime(restTimer)}</div>
              <button onClick={() => { setTimerRunning(false); setRestTimer(0); }} className="text-xs text-brand-600 font-semibold mt-1">Skip Rest</button>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Workout Tracking</h3>
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-navy-400 px-2">
              <span className="col-span-1">#</span>
              <span className="col-span-3 text-center">Weight</span>
              <span className="col-span-2 text-center">Reps</span>
              <span className="col-span-2 text-center">RPE</span>
              <span className="col-span-4 text-center">Status</span>
            </div>
            {sets.map((s, i) => (
              <div key={i} className={cn('grid grid-cols-12 gap-2 items-center p-2 rounded-xl', s.done ? 'bg-success-50' : 'bg-navy-50')}>
                <span className="col-span-1 text-sm font-bold text-navy-700">{s.set}</span>
                <div className="col-span-3"><input type="number" value={s.weight} onChange={(e) => setSets((p) => p.map((x, j) => j === i ? { ...x, weight: +e.target.value } : x))} className="w-full px-2 py-1 rounded-lg bg-white border border-navy-200 text-center text-sm" disabled={s.done} /></div>
                <div className="col-span-2"><input type="number" value={s.reps} onChange={(e) => setSets((p) => p.map((x, j) => j === i ? { ...x, reps: +e.target.value } : x))} className="w-full px-2 py-1 rounded-lg bg-white border border-navy-200 text-center text-sm" disabled={s.done} /></div>
                <div className="col-span-2"><input type="number" value={s.rpe} onChange={(e) => setSets((p) => p.map((x, j) => j === i ? { ...x, rpe: +e.target.value } : x))} className="w-full px-2 py-1 rounded-lg bg-white border border-navy-200 text-center text-sm" disabled={s.done} /></div>
                <div className="col-span-4 flex justify-center">
                  {s.done ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-success-600"><Icon name="check-circle" size={14} /> Done</span>
                  ) : (
                    <button onClick={() => completeSet(i)} className="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">Complete</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary text-xs py-2"><Icon name="skip-forward" size={14} /> Skip</button>
            <button className="btn-secondary text-xs py-2"><Icon name="replace" size={14} /> Replace</button>
          </div>
          <button onClick={nextExercise} className="btn-primary w-full mt-2"><Icon name="chevron-right" size={16} /> Next Exercise</button>
        </div>
      </div>
    </div>
  );
}
