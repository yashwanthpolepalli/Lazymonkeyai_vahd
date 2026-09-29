import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { LineChart, BarChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/utils/cn';

interface RecentCheckin {
  customer_id: string;
  customer_name: string;
  avatar: string;
  event_type: string;
  direction: string;
  device_name: string;
  timestamp: string;
  status: string;
}

interface AttendanceAnalytics {
  today_checkins: number;
  peak_hour: string;
  avg_duration: string;
  hourly_data: number[];
  hourly_labels: string[];
  weekly_data: number[];
  weekly_labels: string[];
  recent_checkins: RecentCheckin[];
}

function formatTimestamp(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function eventBadgeVariant(event_type: string): 'brand' | 'success' | 'ai' | 'warning' {
  const t = (event_type || '').toLowerCase();
  if (t.includes('face')) return 'brand';
  if (t.includes('finger')) return 'success';
  if (t.includes('rfid') || t.includes('card')) return 'ai';
  return 'warning';
}

function eventBadgeLabel(event_type: string, direction: string): string {
  const t = (event_type || '').toLowerCase();
  const dir = (direction || '').toLowerCase();
  if (t.includes('face'))        return 'Face Recognition';
  if (t.includes('finger'))      return 'Fingerprint';
  if (t.includes('rfid') || t.includes('card')) return 'RFID Card';
  if (dir === 'check_out')       return 'Check-Out';
  return 'Check-In';
}

export function AttendancePage() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    let isMounted = true;
    apiClient.get<AttendanceAnalytics>('/biometrics/analytics')
      .then((a) => {
        if (isMounted) setAnalytics(a);
      })
      .catch(() => {
        if (isMounted) setAnalytics(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Hourly chart — all 24 hours from DB (supports 24/7 gyms)
  const hourlyData   = analytics?.hourly_data   ?? [];
  const hourlyLabels = analytics?.hourly_labels ?? [];

  // Weekly trend — 7-day daily count from DB
  const weeklyData   = analytics?.weekly_data   ?? [];
  const weeklyLabels = analytics?.weekly_labels ?? [];

  // KPIs from DB
  const todayCheckins = analytics?.today_checkins ?? 0;
  const peakHour      = analytics?.peak_hour      ?? '—';
  const avgDuration   = analytics?.avg_duration   ?? '—';

  // Recent check-in events from DB
  const recentCheckins = analytics?.recent_checkins ?? [];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <PageHeader title="Attendance" breadcrumb={['Owner', 'Attendance']} />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Today's Check-ins</span>
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon name="log-in" size={16} className="text-brand-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{todayCheckins}</div>
            <div className="text-xs text-navy-400 mt-1">Live from biometric logs</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Peak Hour</span>
              <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                <Icon name="clock" size={16} className="text-warning-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900 text-base leading-tight">{peakHour}</div>
            <div className="text-xs text-navy-400 mt-1">Highest traffic today</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Avg Session Duration</span>
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                <Icon name="timer" size={16} className="text-success-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">{avgDuration}</div>
            <div className="text-xs text-navy-400 mt-1">Check-in → Check-out</div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">Active Members</span>
              <div className="w-8 h-8 rounded-lg bg-ai-50 flex items-center justify-center">
                <Icon name="activity" size={16} className="text-ai-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-navy-900">
              {recentCheckins.length > 0
                ? new Set(recentCheckins.map(r => r.customer_id)).size
                : 0}
            </div>
            <div className="text-xs text-navy-400 mt-1">Unique members (recent)</div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(['today', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all',
              view === v ? 'bg-brand-600 text-white' : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">
            {view === 'today' ? 'Weekly Check-in Trend' : 'Weekly Check-in Trend'}
          </h3>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : weeklyData.length > 0 ? (
            <LineChart data={weeklyData} labels={weeklyLabels} height={200} color="#2563eb" />
          ) : (
            <div className="h-48 flex items-center justify-center text-navy-400 text-sm">No data yet</div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy-900 mb-4">Hourly Distribution</h3>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : hourlyData.length > 0 ? (
            <BarChart data={hourlyData} labels={hourlyLabels} height={200} color="#059669" />
          ) : (
            <div className="h-48 flex items-center justify-center text-navy-400 text-sm">No check-ins today</div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-bold text-navy-900 mb-4">Recent Check-ins</h3>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : recentCheckins.length === 0 ? (
          <div className="py-8 text-center text-navy-400 text-sm">No biometric check-ins recorded yet</div>
        ) : (
          <div className="space-y-2">
            {recentCheckins.map((r, i) => {
              const initials = (r.customer_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={`${r.customer_id}-${i}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-navy-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-navy-900 truncate">{r.customer_name}</div>
                    <div className="text-xs text-navy-400 truncate">{r.device_name}</div>
                  </div>
                  <Badge variant={eventBadgeVariant(r.event_type)}>
                    {eventBadgeLabel(r.event_type, r.direction)}
                  </Badge>
                  <div className="text-xs text-navy-400 font-medium shrink-0">
                    {formatTimestamp(r.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
