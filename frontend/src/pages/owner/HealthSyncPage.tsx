import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { HealthConnection, HealthSummary, TrainingReadiness } from '@/types';
import { cn } from '@/utils/cn';

export function HealthSyncPage() {
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [readiness, setReadiness] = useState<TrainingReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [togglingPlatform, setTogglingPlatform] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [c, s, r] = await Promise.all([
        api.health.connections(),
        api.health.summary(),
        api.health.readiness()
      ]);
      setConnections(c);
      setSummary(s);
      setReadiness(r);
    } catch (_err) {
      console.error('Failed to load health metrics:', _err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleConnection = async (conn: HealthConnection) => {
    setTogglingPlatform(conn.id);
    try {
      const res = await api.health.toggleConnection(conn.id, !conn.connected);
      setConnections(prev =>
        prev.map(c => c.id === conn.id ? { ...c, connected: !c.connected } : c)
      );
      setFeedbackMessage(res.message || `${conn.name} status updated.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (_err) {
      console.error('Failed to toggle connection', _err);
    } finally {
      setTogglingPlatform(null);
    }
  };

  const handleLiveSync = async () => {
    setSyncing(true);
    try {
      const res = await api.health.simulateSync();
      if (res.summary) {
        setSummary(res.summary);
      }
      if (res.readinessScore) {
        setReadiness(prev => prev ? { ...prev, score: res.readinessScore } : null);
      }
      setFeedbackMessage('⚡ Live wearable telemetry synchronized and deduplicated!');
      setTimeout(() => setFeedbackMessage(null), 3500);
      await loadData();
    } catch (_err) {
      console.error('Live sync error:', _err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const todayMetrics = [
    { label: 'Steps', value: summary?.steps ? summary.steps.toLocaleString() : '0', icon: 'footprints', color: 'text-brand-600', available: (summary?.steps ?? 0) > 0 },
    { label: 'Active Calories', value: `${summary?.activeCalories || 0} kcal`, icon: 'flame', color: 'text-danger-600', available: (summary?.activeCalories ?? 0) > 0 },
    { label: 'Sleep', value: summary?.sleep && summary.sleep !== '—' ? summary.sleep : '—', icon: 'moon', color: 'text-indigo-600', available: Boolean(summary?.sleep && summary.sleep !== '—') },
    { label: 'Distance', value: `${summary?.distance || 0} km`, icon: 'activity', color: 'text-success-600', available: (summary?.distance ?? 0) > 0 },
    { label: 'Heart Rate', value: summary?.heartRate ? `${summary.heartRate} bpm` : '—', icon: 'heart-pulse', color: 'text-danger-600', available: (summary?.heartRate ?? 0) > 0 },
    { label: 'Workouts', value: `${summary?.workouts || 0}`, icon: 'dumbbell', color: 'text-warning-600', available: (summary?.workouts ?? 0) > 0 },
  ];

  const readinessScore = readiness?.score ?? 0;
  const readinessSignals = [
    { label: 'Steps Activity', value: readiness?.steps?.value || 'No step data', available: readiness?.steps?.available ?? false, icon: 'footprints' },
    { label: 'Sleep Recovery', value: readiness?.sleep?.value || 'No sleep data', available: readiness?.sleep?.available ?? false, icon: 'moon' },
    { label: 'Resting Heart Rate', value: readiness?.heartRate?.value || 'No heart rate sync', available: readiness?.heartRate?.available ?? false, icon: 'heart-pulse' },
    { label: 'Workout Load Strain', value: readiness?.workoutLoad?.value || 'No sessions logged', available: readiness?.workoutLoad?.available ?? false, icon: 'dumbbell' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader title="Health Connections" breadcrumb={['Owner', 'Health Sync']} />
        <button
          onClick={handleLiveSync}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Icon name="refresh-cw" size={16} className={cn(syncing && 'animate-spin')} />
          {syncing ? 'Syncing Wearables...' : '⚡ Force Live Wearable Sync'}
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <Icon name="check-circle" size={16} className="text-emerald-600 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {connections.map((conn) => (
          <div key={conn.id} className="card p-5 transition-all hover:shadow-md border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Icon name={conn.icon || 'activity'} size={22} className="text-slate-700" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{conn.name}</div>
                  <Badge variant={conn.connected ? 'success' : 'neutral'} dot>
                    {conn.connected ? 'Connected & Live' : 'Not Connected'}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => handleToggleConnection(conn)}
                disabled={togglingPlatform === conn.id}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                  conn.connected
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                )}
              >
                {togglingPlatform === conn.id ? 'Updating...' : (conn.connected ? 'Disconnect' : 'Connect')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {conn.metrics.map((m) => (
                <div
                  key={m.name}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
                    conn.connected && m.available ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', conn.connected && m.available ? 'bg-emerald-500' : 'bg-slate-300')} />
                  {m.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900">Today's Deduplicated Activity</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Canonical Real-Time Summary</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {todayMetrics.map((m) => (
            <div key={m.label} className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center mx-auto mb-2">
                <Icon name={m.icon} size={18} className={m.color} />
              </div>
              <div className="text-lg font-black text-slate-900">{m.value}</div>
              <div className="text-xs text-slate-400 font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 bg-gradient-to-br from-brand-50/40 via-white to-indigo-50/30 border border-brand-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
              <Icon name="activity" size={16} className="text-white" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Fit Club Dynamic Training Readiness</h3>
          </div>
          <Badge variant="brand">4-Signal AI Engine</Badge>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg width="140" height="140" className="-rotate-90">
                <circle cx="70" cy="70" r="58" fill="none" stroke="#e2e8f0" strokeWidth="11" />
                <circle
                  cx="70"
                  cy="70"
                  r="58"
                  fill="none"
                  stroke={readinessScore >= 80 ? '#10b981' : (readinessScore >= 65 ? '#f59e0b' : '#ef4444')}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${(readinessScore) * 3.64} 999`}
                  style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900">{readinessScore}</span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">/ 100</span>
              </div>
            </div>
            <div className={cn(
              'text-sm font-bold mt-3 px-3 py-1 rounded-full',
              readinessScore >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            )}>
              {readinessScore >= 80 ? '🟢 Optimal — Ready to Train' : '🟡 Moderate Training Load'}
            </div>
          </div>
          <div className="lg:col-span-2 space-y-3">
            {readinessSignals.map((sig) => (
              <div key={sig.label} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', sig.available ? 'bg-emerald-50' : 'bg-slate-100')}>
                  <Icon name={sig.icon} size={16} className={sig.available ? 'text-emerald-600' : 'text-slate-400'} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">{sig.label}</div>
                  <div className="text-xs text-slate-500 font-medium">{sig.value}</div>
                </div>
                <Icon name={sig.available ? 'check-circle' : 'alert-circle'} size={16} className={sig.available ? 'text-emerald-500' : 'text-amber-500'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

