import { useState, useEffect } from 'react';
import { KpiCard } from '@/components/ui/KpiCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Icon } from '@/components/ui/Icon';
import { LineChart, BarChart, DonutChart } from '@/components/ui/Charts';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import type { KpiCard as KpiType, RevenueData } from '@/types';

export function SuperAdminDashboard() {
  const [kpis, setKpis] = useState<KpiType[]>([]);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  // Onboard Gym Modal State
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    gym_name: '',
    branch_name: '',
    city: '',
    address: '',
    owner_name: '',
    owner_email: '',
    password: '',
  });
  const [onboarding, setOnboarding] = useState(false);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([api.dashboard.superAdminKpis(), api.dashboard.revenue()]).then(([k, r]) => {
      setKpis(k || []); setRevenue(r); setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOnboardGymSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.gym_name.trim()) return;
    setOnboarding(true);
    try {
      await api.superAdmin.onboardGym(onboardForm);
      setOnboardOpen(false);
      setOnboardForm({ gym_name: '', branch_name: '', city: '', address: '', owner_name: '', owner_email: '', password: '' });
      fetchDashboardData();
    } catch (_err) {
      /* ignore */
    } finally {
      setOnboarding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        breadcrumb={['Super Admin', 'Overview']}
        actions={
          <button onClick={() => setOnboardOpen(true)} className="btn-primary flex items-center gap-2">
            <Icon name="plus" size={16} /> Onboard Gym
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{kpis.map((k) => <KpiCard key={k.id} {...k} />)}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-navy-900 mb-4">MRR Growth</h3>
          {loading || !revenue ? <Skeleton className="h-48 w-full" /> : (
            <LineChart data={revenue.mrr} labels={revenue.labels} height={200} color="#2563eb" />
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Revenue by Plan</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (() => {
            const totalGyms = kpis.find(k => k.id === 'total_gyms' || k.label === 'Total Gyms')?.value || 0;
            const planDistribution = (revenue as any)?.planDistribution || [];

            return (
              <>
                <div className="flex justify-center mb-4">
                  <DonutChart segments={planDistribution} size={160} centerLabel={String(totalGyms)} centerSublabel="Gyms" />
                </div>
                {planDistribution.length > 0 ? (
                  <div className="space-y-2">
                    {planDistribution.map((s: any) => (
                      <div key={s.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: s.color || '#3b82f6' }} />
                          <span className="text-navy-600 font-medium">{s.label}</span>
                        </div>
                        <span className="font-semibold text-navy-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400 font-medium">No plan data available</div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">New Gym Growth</h3>
          {loading || !revenue ? <Skeleton className="h-48 w-full" /> : (
            <BarChart data={revenue.newCustomers} labels={revenue.labels} height={180} color="#059669" />
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-base font-bold text-navy-900 mb-4">Churn Rate</h3>
          {loading || !revenue ? <Skeleton className="h-48 w-full" /> : (
            <LineChart data={revenue.churn} labels={revenue.labels} height={180} color="#dc2626" />
          )}
        </div>
      </div>

      {/* Onboard Gym Modal */}
      {onboardOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-100 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icon name="building-2" size={18} className="text-brand-600" /> Onboard New Gym Branch
              </h3>
              <button onClick={() => setOnboardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
              </button>
            </div>

            <form onSubmit={handleOnboardGymSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Gym Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Gym Elite"
                  value={onboardForm.gym_name}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, gym_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Branch"
                    value={onboardForm.branch_name}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, branch_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. City Name"
                    value={onboardForm.city}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street / Area Address"
                  value={onboardForm.address}
                  onChange={(e) => setOnboardForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Owner Name"
                    value={onboardForm.owner_name}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, owner_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Owner Email</label>
                  <input
                    type="email"
                    placeholder="owner@example.com"
                    value={onboardForm.owner_email}
                    onChange={(e) => setOnboardForm((p) => ({ ...p, owner_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOnboardOpen(false)} className="btn-secondary py-2 px-4 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={onboarding} className="btn-primary py-2 px-4 text-xs font-bold">
                  {onboarding ? 'Onboarding...' : 'Save & Onboard Gym'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
